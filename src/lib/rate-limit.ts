/**
 * Rate limiting implementation.
 * Uses in-memory store for simplicity (consider Redis for production).
 */

import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Cleanup every minute

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : "unknown";
  return ip || "unknown";
}

/**
 * Create a rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 100,
    message = "Too many requests, please try again later.",
    keyGenerator = defaultKeyGenerator,
  } = config;

  return async function rateLimit(
    req: NextRequest
  ): Promise<{ success: true } | { success: false; response: NextResponse }> {
    const key = keyGenerator(req);
    const now = Date.now();

    // Get or create entry
    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      return {
        success: false,
        response: NextResponse.json(
          {
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message,
              retryAfter,
            },
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfter),
              "X-RateLimit-Limit": String(maxRequests),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Math.ceil(entry.resetTime / 1000)),
            },
          }
        ),
      };
    }

    return { success: true };
  };
}

/**
 * Pre-configured rate limiters for different endpoints
 */
export const rateLimiters = {
  // General API: 100 requests per minute
  general: createRateLimiter({
    windowMs: 60000,
    maxRequests: 100,
    message: "请求过于频繁，请稍后再试",
  }),

  // Image generation: 10 requests per minute (expensive operation)
  generate: createRateLimiter({
    windowMs: 60000,
    maxRequests: 10,
    message: "图片生成请求过于频繁，请稍后再试",
  }),

  // Auth endpoints: 5 requests per minute (prevent brute force)
  auth: createRateLimiter({
    windowMs: 60000,
    maxRequests: 5,
    message: "认证请求过于频繁，请稍后再试",
  }),

  // Sync endpoints: 20 requests per minute
  sync: createRateLimiter({
    windowMs: 60000,
    maxRequests: 20,
    message: "同步请求过于频繁，请稍后再试",
  }),
};

/**
 * Apply rate limiting to a request
 */
export async function applyRateLimit(
  req: NextRequest,
  limiter: ReturnType<typeof createRateLimiter> = rateLimiters.general
): Promise<NextResponse | null> {
  const result = await limiter(req);

  if (!result.success) {
    return result.response;
  }

  return null; // No rate limit hit
}
