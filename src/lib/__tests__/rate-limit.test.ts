import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter } from "@/lib/rate-limit";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user1")).toBe(true);
  });

  it("blocks requests over the limit", () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });
    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user1")).toBe(false);
  });

  it("resets after the window expires", () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });
    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user1")).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(limiter.check("user1")).toBe(true);
  });

  it("tracks different keys independently", () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });
    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user2")).toBe(true);
    expect(limiter.check("user1")).toBe(false);
    expect(limiter.check("user2")).toBe(false);
  });

  it("prunes expired timestamps on check", () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });

    limiter.check("user1");
    vi.advanceTimersByTime(600);
    limiter.check("user1");
    // At this point: 2 requests, at t=0 and t=600

    vi.advanceTimersByTime(500);
    // Now t=1100: first request (t=0) is expired, second (t=600) still valid
    // So we should have room for 1 more
    expect(limiter.check("user1")).toBe(true);
  });

  it("handles sliding window correctly", () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });

    limiter.check("a"); // t=0
    vi.advanceTimersByTime(400);
    limiter.check("a"); // t=400
    vi.advanceTimersByTime(400);
    limiter.check("a"); // t=800
    // All 3 slots used

    expect(limiter.check("a")).toBe(false); // t=800, still blocked

    vi.advanceTimersByTime(300);
    // t=1100: first request (t=0) expired, 2 remain
    expect(limiter.check("a")).toBe(true);
  });
});
