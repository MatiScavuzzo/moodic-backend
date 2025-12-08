import { Elysia } from 'elysia';
import { MoodSchema } from './schema/mood.schema';
import generateMoodic from './services/llm.service';
import {
  getSpotifyAccessToken,
  getSpotifySearchPlaylists,
  getSpotifyUser,
  loginSpotify,
  refreshSpotifyToken,
} from './services/spotify.service';
import { LLMResponse, LLMResponseSchema } from './schema/llmResponse.schema';
import { cors } from '@elysiajs/cors';
import { networkInterfaces } from 'os';
import { checkRateLimit, getClientIP } from './middleware/rateLimit';

// Función para obtener la IP local
function getLocalIP(): string | null {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Ignorar direcciones internas (no IPv4) y no-internas
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

// Configuración de entorno
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const localIP = getLocalIP();

// Orígenes permitidos para CORS
const allowedOrigins = isProduction
  ? [
      'https://moodic.com.ar',
      'https://www.moodic.com.ar',
      'http://127.0.0.1:5173',
      // Agregar aquí otros dominios si los tienes (ej: app.moodic.com.ar)
    ]
  : [
      'http://localhost:3001',
      'http://localhost:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3000',
      // Permitir acceso desde el teléfono en desarrollo
      ...(localIP ? [`http://${localIP}:3001`, `http://${localIP}:3000`] : []),
    ];

const app = new Elysia()
  .use(
    cors({
      origin: (request: Request) => {
        // En desarrollo, permitir todos los orígenes
        if (!isProduction) {
          return true;
        }
        // En producción, verificar contra la lista de orígenes permitidos
        const origin = request.headers.get('origin');
        // Si no hay origin, es una petición del servidor (no del navegador)
        // Permitir estas peticiones ya que no tienen problemas de CORS
        if (!origin) return true;
        return allowedOrigins.includes(origin);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
      ],
    })
  )
  // Middleware para agregar headers de seguridad en producción
  .onBeforeHandle(({ set }) => {
    if (isProduction) {
      set.headers['X-Content-Type-Options'] = 'nosniff';
      set.headers['X-Frame-Options'] = 'DENY';
      set.headers['X-XSS-Protection'] = '1; mode=block';
      set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
      // No agregar Strict-Transport-Security aquí, debe ir en el servidor/proxy (Vercel lo maneja)
    }
  })
  .get('/', () => {
    return 'Moodic backend project';
  })
  .post('/mood', async ({ body, headers }) => {
    const clientIp = getClientIP(headers);
    const rateLimitResult = await checkRateLimit(clientIp, {
      maxRequests: 4,
      windowMs: 60 * 60 * 1000, // 1 hora
      keyPrefix: 'ratelimit:mood',
    });

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Has excedido el límite de requests. Intenta de nuevo en ${Math.ceil(
            (rateLimitResult.resetAt - Date.now()) / 1000 / 60
          )} minutos.`,
          resetAt: rateLimitResult.resetAt,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '4',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
            'Retry-After': Math.ceil(
              (rateLimitResult.resetAt - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    // Validar con Zod antes de pasar al handler
    const validatedBody = MoodSchema.parse(body);
    const moodic = await generateMoodic({ mood: validatedBody });

    return new Response(
      JSON.stringify({
        message: 'Mood processed',
        moodic: moodic,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '4',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
        },
      }
    );
  })
  .get('/playlists', async ({ query, headers }) => {
    // Rate limiting para playlists: más permisivo (20/hora)
    const clientIp = getClientIP(headers);
    const rateLimitResult = await checkRateLimit(clientIp, {
      maxRequests: 20,
      windowMs: 60 * 60 * 1000, // 1 hora
      keyPrefix: 'ratelimit:playlists',
    });

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Has excedido el límite de requests. Intenta de nuevo en ${Math.ceil(
            (rateLimitResult.resetAt - Date.now()) / 1000 / 60
          )} minutos.`,
          resetAt: rateLimitResult.resetAt,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
            'Retry-After': Math.ceil(
              (rateLimitResult.resetAt - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Token de autorización requerido' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Parsear moodic desde query params
    const moodicParam = query.moodic;
    if (!moodicParam) {
      return new Response(
        JSON.stringify({ error: 'Parámetro moodic requerido' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    let moodic: LLMResponse;
    try {
      const parsed = JSON.parse(decodeURIComponent(moodicParam));
      // Validar con Zod
      moodic = LLMResponseSchema.parse(parsed);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Formato de moodic inválido' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const playlists = await getSpotifySearchPlaylists(token, moodic);
    if (!playlists) {
      return new Response(
        JSON.stringify({ error: 'No se pudieron obtener las playlists' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify(playlists), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': '20',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
      },
    });
  })
  .get('/me', async ({ headers }) => {
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Token de autorización requerido' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const user = await getSpotifyUser(token);
      return new Response(JSON.stringify(user), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error en /me:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      return new Response(
        JSON.stringify({
          error: 'Error al obtener usuario de Spotify',
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  })
  .get('/login', async () => {
    const { url } = loginSpotify();
    // Redirigir al usuario a la URL de autorización de Spotify
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
      },
    });
  })
  .post('/auth/spotify/callback', async ({ body }) => {
    const { code, state } = body as { code: string; state: string };
    const data = await getSpotifyAccessToken(code, state);
    return data;
  })
  .post('/auth/refresh', async ({ body }) => {
    const { refresh_token } = body as { refresh_token: string };
    if (!refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Refresh token requerido' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    try {
      const data = await refreshSpotifyToken(refresh_token);
      return data;
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Error al renovar el token' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  });

// Start server
app.listen(PORT);

// Logs según el entorno
if (isProduction) {
  console.log(`🚀 Moodic Backend running in PRODUCTION mode`);
  console.log(`🌐 Server: ${app.server?.url}`);
} else {
  console.log(`🦊 Elysia is running on ${app.server?.url}`);
  if (localIP) {
    console.log(
      `📱 Accede desde tu teléfono en la misma red: http://${localIP}:${PORT}`
    );
  } else {
    console.log(
      `⚠️  No se pudo detectar la IP local. Asegúrate de estar conectado a una red.`
    );
  }
}

// Export for Vercel
export default app;
