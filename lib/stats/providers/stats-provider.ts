/**
 * Common shape all stats providers normalize into before ingestion.
 *
 * `externalKey` is the provider's identifier for whoever produced the stat line —
 * it is matched against `ProPlayer.externalRefId` or `Champion.riotKey` during
 * ingestion, not here. Providers don't need to know which Draftable pool they'll
 * land in.
 */
export interface NormalizedStatRow {
  externalGameId: string;
  externalKey: string;
  gameDate: Date;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  visionScore: number;
  win: boolean;
  raw: unknown;
}

export interface StatsProvider {
  source: "RIOT";
  fetchRawStats(input: { since?: Date }): Promise<NormalizedStatRow[]>;
}
