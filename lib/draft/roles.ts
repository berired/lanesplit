/**
 * A roster mirrors one real League of Legends match: exactly one pick per role.
 * This is intentionally independent of League.rosterSize (a legacy/display-only
 * column from before roster composition was role-locked) — ROSTER_SIZE is the
 * single source of truth for how many rounds a draft runs and how many roles a
 * roster has, so older leagues can't end up soft-locked by a stale stored value.
 */
export const ROLES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"] as const;
export type Role = (typeof ROLES)[number];

export const ROSTER_SIZE = ROLES.length;

/** Pure — returns the roles not yet present in `filledRoles`, in canonical order. */
export function getOpenRoles(filledRoles: readonly string[]): Role[] {
  const filled = new Set(filledRoles);
  return ROLES.filter((role) => !filled.has(role));
}
