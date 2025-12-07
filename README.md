# 🎵 Moodic Backend

Backend API para Moodic - Una aplicación que genera playlists personalizadas de Spotify basadas en tu estado de ánimo usando IA.

## 🚀 Características

- **Procesamiento de Mood con IA**: Utiliza Google Gemini para analizar estados de ánimo y generar términos de búsqueda musicales
- **Integración con Spotify**: Búsqueda de playlists personalizadas basadas en intereses del usuario
- **Rate Limiting**: Protección contra abuso con Redis
- **Autenticación OAuth 2.0**: Integración completa con Spotify
- **CORS Configurado**: Listo para producción con dominios específicos
- **Headers de Seguridad**: Implementados para protección adicional

## 🛠️ Tecnologías

- **[Elysia.js](https://elysiajs.com/)**: Framework web rápido y moderno
- **[Bun](https://bun.sh/)**: Runtime JavaScript de alto rendimiento
- **[Google Gemini AI](https://ai.google.dev/)**: Procesamiento de lenguaje natural
- **[Spotify Web API](https://developer.spotify.com/)**: Integración con Spotify
- **[Redis](https://redis.io/)**: Rate limiting y caching
- **[TypeScript](https://www.typescriptlang.org/)**: Tipado estático
- **[Zod](https://zod.dev/)**: Validación de esquemas

## 📋 Requisitos Previos

- [Bun](https://bun.sh/) >= 1.0.0
- Cuenta de [Spotify Developer](https://developer.spotify.com/)
- Cuenta de [Google AI Studio](https://makersuite.google.com/app/apikey) (para Gemini)
- Instancia de Redis (local o [Redis Cloud](https://redis.com/cloud/))

## 🔧 Instalación

1. **Clonar el repositorio**

```bash
git clone https://github.com/MatiScavuzzo/moodic-backend.git
cd moodic-backend
```

2. **Instalar dependencias**

```bash
bun install
```

3. **Configurar variables de entorno**

Crea un archivo `.env` en la raíz del proyecto:

```env
# Spotify API
SPOTIFY_CLIENT_ID=tu_client_id
SPOTIFY_CLIENT_SECRET=tu_client_secret
SPOTIFY_TOKEN_URL=https://accounts.spotify.com/api/token
SPOTIFY_SEARCH_URL=https://api.spotify.com/v1/search
SPOTIFY_CURRENT_USER_URL=https://api.spotify.com/v1/me
SPOTIFY_AUTH_URL=https://accounts.spotify.com/authorize
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/spotify/callback
SPOTIFY_API_BASE=https://api.spotify.com/v1

# Google AI (Gemini)
GOOGLE_API_KEY=tu_google_api_key

# Redis
REDIS_URL=redis://localhost:6379
# O para Redis Cloud:
# REDIS_URL=redis://default:password@host:port

# Entorno
NODE_ENV=development
PORT=3000
```

## 🏃 Desarrollo

```bash
# Iniciar servidor en modo desarrollo
bun run dev

# El servidor estará disponible en http://localhost:3000
```

## 📚 API Endpoints

### `GET /`

Health check del servidor.

**Respuesta:**

```json
"Moodic backend project"
```

### `POST /mood`

Procesa un estado de ánimo y genera términos de búsqueda musicales.

**Request:**

```json
{
  "mood": "Estoy triste, quiero escuchar música para animarme",
  "preferences": {
    "genres": ["pop", "rock"],
    "excludeGenres": ["metal"],
    "energy": "high",
    "tempo": "fast"
  }
}
```

**Response:**

```json
{
  "message": "Mood processed",
  "moodic": {
    "genres": ["pop", "rock", "indie"],
    "mood": "energetic",
    "keywords": ["upbeat", "motivational"],
    "tempo": "fast"
  }
}
```

**Rate Limit:** 4 requests/hora por IP

### `GET /playlists`

Busca playlists en Spotify basadas en un moodic generado.

**Query Parameters:**

- `moodic`: JSON stringificado del objeto moodic

**Headers:**

- `Authorization: Bearer <spotify_access_token>`

**Response:**

```json
{
  "playlists": {
    "items": [
      {
        "id": "playlist_id",
        "name": "Playlist Name",
        "external_urls": {
          "spotify": "https://open.spotify.com/playlist/..."
        },
        "images": [...]
      }
    ]
  }
}
```

**Rate Limit:** 20 requests/hora por IP

### `GET /me`

Obtiene información del usuario autenticado de Spotify.

**Headers:**

- `Authorization: Bearer <spotify_access_token>`

**Response:**

```json
{
  "id": "user_id",
  "display_name": "User Name",
  "email": "user@example.com",
  "images": [...]
}
```

### `GET /login`

Inicia el flujo de autenticación OAuth con Spotify.

**Response:**
Redirige a la página de autorización de Spotify.

### `POST /auth/spotify/callback`

Callback para el flujo OAuth de Spotify.

**Request:**

```json
{
  "code": "authorization_code",
  "state": "state_string"
}
```

**Response:**

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600
}
```

### `POST /auth/refresh`

Renueva el token de acceso de Spotify.

**Request:**

```json
{
  "refresh_token": "refresh_token_string"
}
```

**Response:**

```json
{
  "access_token": "...",
  "expires_in": 3600
}
```

## 🚢 Despliegue

### Vercel

Este proyecto está configurado para desplegarse en Vercel con Bun runtime.

1. **Conectar con Vercel**

```bash
vercel
```

2. **Configurar variables de entorno en Vercel Dashboard**

   - Ve a Settings → Environment Variables
   - Agrega todas las variables del archivo `.env`

3. **Configurar dominio**

   - En Settings → Domains, agrega tu dominio
   - Ejemplo: `api.moodic.com.ar`

4. **Deploy**

```bash
vercel --prod
```

### Variables de Entorno en Producción

Asegúrate de actualizar:

- `SPOTIFY_REDIRECT_URI`: Debe apuntar a tu dominio de producción
- `REDIS_URL`: URL de tu instancia de Redis en producción
- `NODE_ENV`: `production`

## 🔒 Seguridad

- **Rate Limiting**: Implementado con Redis para prevenir abuso
- **CORS**: Configurado para permitir solo dominios específicos en producción
- **Headers de Seguridad**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`

## 📊 Rate Limits

- `/mood`: 4 requests/hora por IP
- `/playlists`: 20 requests/hora por IP

Los límites se resetean automáticamente después de la ventana de tiempo.

## 📝 Estructura del Proyecto

```

Backend/
├── src/
│ ├── index.ts # Punto de entrada principal
│ ├── middleware/
│ │ └── rateLimit.ts # Middleware de rate limiting
│ ├── schema/
│ │ ├── mood.schema.ts # Esquema de validación para mood
│ │ └── llmResponse.schema.ts # Esquema de respuesta del LLM
│ ├── services/
│ │ ├── llm.service.ts # Servicio de Google Gemini
│ │ ├── redis.service.ts # Cliente de Redis
│ │ └── spotify.service.ts # Integración con Spotify API
│ └── utils/
│ └── moodParser.ts # Utilidades para parsear mood
├── api/
│ └── index.ts # Handler para Vercel (serverless)
├── vercel.json # Configuración de Vercel
├── package.json
└── README.md

```

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👤 Autor

**MatiScavuzzo**

- GitHub: [@MatiScavuzzo](https://github.com/MatiScavuzzo)

## 🙏 Agradecimientos

- [Elysia.js](https://elysiajs.com/) por el framework increíble
- [Spotify](https://developer.spotify.com/) por la API
- [Google Gemini](https://ai.google.dev/) por el poder de IA

---

⭐ Si te gusta este proyecto, dale una estrella en GitHub!

```

```
