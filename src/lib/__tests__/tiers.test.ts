import { describe, it, expect } from "vitest";
import {
  TIER_CONFIG,
  DEFAULT_TIER,
  isTierName,
  getTierConfig,
} from "@/lib/tiers";

describe("TIER_CONFIG", () => {
  it("defines free, pro, and ultra tiers", () => {
    expect(TIER_CONFIG).toHaveProperty("free");
    expect(TIER_CONFIG).toHaveProperty("pro");
    expect(TIER_CONFIG).toHaveProperty("ultra");
  });

  it("free tier has correct limits", () => {
    expect(TIER_CONFIG.free).toEqual({ credits: 1000, notes: 50, maxChars: 1000 });
  });

  it("pro tier has higher limits than free", () => {
    expect(TIER_CONFIG.pro.credits).toBeGreaterThan(TIER_CONFIG.free.credits);
    expect(TIER_CONFIG.pro.notes).toBeGreaterThan(TIER_CONFIG.free.notes);
    expect(TIER_CONFIG.pro.maxChars).toBeGreaterThan(TIER_CONFIG.free.maxChars);
  });

  it("ultra tier has highest limits", () => {
    expect(TIER_CONFIG.ultra.credits).toBeGreaterThan(TIER_CONFIG.pro.credits);
    expect(TIER_CONFIG.ultra.notes).toBe(Infinity);
    expect(TIER_CONFIG.ultra.maxChars).toBeGreaterThan(TIER_CONFIG.pro.maxChars);
  });
});

describe("DEFAULT_TIER", () => {
  it("defaults to free", () => {
    expect(DEFAULT_TIER).toBe("free");
  });
});

describe("isTierName", () => {
  it("returns true for valid tier names", () => {
    expect(isTierName("free")).toBe(true);
    expect(isTierName("pro")).toBe(true);
    expect(isTierName("ultra")).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isTierName("premium")).toBe(false);
    expect(isTierName("")).toBe(false);
    expect(isTierName(null)).toBe(false);
    expect(isTierName(undefined)).toBe(false);
  });
});

describe("getTierConfig", () => {
  it("returns config for valid tier", () => {
    const result = getTierConfig("pro");
    expect(result.tier).toBe("pro");
    expect(result.credits).toBe(5000);
    expect(result.notes).toBe(250);
    expect(result.maxChars).toBe(20000);
  });

  it("falls back to free for invalid tier", () => {
    const result = getTierConfig("invalid");
    expect(result.tier).toBe("free");
    expect(result.credits).toBe(1000);
  });

  it("falls back to free for null/undefined", () => {
    expect(getTierConfig(null).tier).toBe("free");
    expect(getTierConfig(undefined).tier).toBe("free");
    expect(getTierConfig().tier).toBe("free");
  });
});
