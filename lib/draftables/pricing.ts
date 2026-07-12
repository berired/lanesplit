/**
 * Shared salary-cap pricing: a role-based baseline (MID/ADC command a premium,
 * SUPPORT is the budget role — a made-up but consistent starting point), scaled
 * by a real win-rate signal where one is available. A 50% win rate is treated
 * as "neutral" (1.0x); winning teams/champions cost more, losing ones cost less.
 */
export const ROLE_BASE_COST: Record<string, number> = {
  MID: 3_000_000,
  ADC: 2_800_000,
  JUNGLE: 2_200_000,
  TOP: 2_000_000,
  SUPPORT: 1_500_000,
};

export function baseCostForRole(role: string): number {
  return ROLE_BASE_COST[role] ?? 2_000_000;
}

/** 0% win rate -> 0.5x, 50% -> 1.0x, 100% -> 1.5x. */
export function priceMultiplierForWinRate(winRate: number): number {
  const clamped = Math.max(0, Math.min(1, winRate));
  return 0.5 + clamped;
}

export function roundToNearest(amount: number, nearest = 100_000): number {
  return Math.round(amount / nearest) * nearest;
}

export function priceForWinRate(baseCost: number, winRate: number): number {
  return roundToNearest(baseCost * priceMultiplierForWinRate(winRate));
}
