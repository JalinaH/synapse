/**
 * Simple in-memory sliding-window rate limiter for server actions.
 *
 * Each limiter instance tracks request timestamps per key (typically user ID or IP).
 * Old entries are pruned on every check to prevent unbounded memory growth.
 */

type RateLimitEntry = {
  timestamps: number[];
};

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(opts: { maxRequests: number; windowMs: number }) {
    this.maxRequests = opts.maxRequests;
    this.windowMs = opts.windowMs;
  }

  /**
   * Returns true if the request should be allowed, false if rate-limited.
   */
  check(key: string): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Prune expired timestamps
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

    if (entry.timestamps.length >= this.maxRequests) {
      return false;
    }

    entry.timestamps.push(now);
    return true;
  }
}

// --- Pre-configured limiters ---

/** Auth actions: 10 attempts per 15 minutes per IP */
export const authLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
});

/** Chat action: 30 requests per minute per user */
export const chatLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000,
});

/** Embedding-heavy actions (add note, search, import): 30 requests per minute per user */
export const embeddingLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000,
});
