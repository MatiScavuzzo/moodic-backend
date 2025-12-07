import redis from '../services/redis.service';

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number; // Ventana de tiempo en milisegundos
  keyPrefix?: string;
}

/**
 * Verifica si una IP puede realizar una request según el rate limit
 * @param ip - IP del cliente
 * @param options - Opciones de rate limiting
 * @returns {Promise<{ allowed: boolean; remaining: number; resetAt: number }>}
 */
export async function checkRateLimit(
  ip: string,
  options: RateLimitOptions
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const { maxRequests, windowMs, keyPrefix = 'ratelimit' } = options;
  const key = `${keyPrefix}:${ip}`;

  try {
    // Obtener el contador actual
    const current = await redis.incr(key);

    // Si es la primera request, establecer el TTL
    if (current === 1) {
      await redis.pexpire(key, windowMs);
    }

    // Calcular cuántas requests quedan
    const remaining = Math.max(0, maxRequests - current);
    const ttl = await redis.pttl(key);
    const resetAt = Date.now() + ttl;

    return {
      allowed: current <= maxRequests,
      remaining,
      resetAt,
    };
  } catch (error) {
    // Si Redis falla, permitir la request (fail open)
    console.error('Error en rate limiting:', error);
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: Date.now() + windowMs,
    };
  }
}

/**
 * Obtiene la IP real del cliente considerando proxies y load balancers
 */
export function getClientIP(headers: Record<string, string | undefined>): string {
  // Cloudflare
  if (headers['cf-connecting-ip']) {
    return headers['cf-connecting-ip'];
  }

  // X-Forwarded-For (puede tener múltiples IPs: cliente, proxy1, proxy2)
  const forwarded = headers['x-forwarded-for'];
  if (forwarded) {
    // Tomar la primera IP (la del cliente original)
    return forwarded.split(',')[0].trim();
  }

  // X-Real-IP
  if (headers['x-real-ip']) {
    return headers['x-real-ip'];
  }

  // Fallback
  return 'unknown';
}

