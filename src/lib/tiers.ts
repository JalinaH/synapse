export const TIER_CONFIG = {
  free: {
    credits: 1000,
    notes: 50,
    maxChars: 1000,
  },
  pro: {
    credits: 5000,
    notes: 250,
    maxChars: 20000,
  },
  ultra: {
    credits: 10000,
    notes: Infinity,
    maxChars: 100000,
  },
} as const;

export type TierName = keyof typeof TIER_CONFIG;

export const DEFAULT_TIER: TierName = "free";

export function isTierName(
  value: string | null | undefined,
): value is TierName {
  return value === "free" || value === "pro" || value === "ultra";
}

export function getTierConfig(value?: string | null) {
  const tier = isTierName(value) ? value : DEFAULT_TIER;
  return { tier, ...TIER_CONFIG[tier] };
}
