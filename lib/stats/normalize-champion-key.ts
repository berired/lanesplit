/**
 * Riot's internal champion keys don't follow a single clean rule from the display
 * name (Kha'Zix -> Khazix, Kai'Sa -> KaiSa, Vel'Koz -> Velkoz — case is inconsistent).
 * Rather than guess the exact casing, strip punctuation/whitespace and compare
 * case-insensitively against both Champion.riotKey and Champion.name.
 */
export function normalizeChampionKey(value: string): string {
  return value.replace(/['".]/g, "").replace(/\s+/g, "").toLowerCase();
}
