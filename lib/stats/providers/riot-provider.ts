import { ValidationError } from "@/lib/errors/app-error";
import { RIOT_TRACKED_MATCH_IDS } from "@/lib/stats/riot-tracked-matches";
import type { NormalizedStatRow, StatsProvider } from "./stats-provider";

/**
 * Best-effort, periodic (NOT real-time) champion-mode stats integration against
 * Riot's official match-v5 API.
 *
 * Real limitations this provider is honest about, per product decision:
 *  - Riot's API is match/summoner-centric. There is no endpoint that returns
 *    "all recent matches" or "all recent champion stats" — you must already know
 *    which match IDs to look up. We read that list from
 *    `lib/stats/riot-tracked-matches.ts`, which a commissioner maintains by hand.
 *  - Dev/personal API keys are rate-limited and (for dev keys) expire every 24h,
 *    so this is meant to be run periodically (e.g. via the weekly-scoring cron
 *    window, or manually), not treated as a live feed.
 *  - `since` is accepted for interface parity with StatsProvider but Riot match
 *    data doesn't offer server-side "since" filtering for an arbitrary match
 *    list, so it's applied client-side after fetching each tracked match.
 */

const MATCH_REGION_ROUTING: Record<string, string> = {
  NA1: "americas",
  BR1: "americas",
  LA1: "americas",
  LA2: "americas",
  OC1: "americas",
  EUW1: "europe",
  EUN1: "europe",
  TR1: "europe",
  RU: "europe",
  KR: "asia",
  JP1: "asia",
};

function routingForMatchId(matchId: string): string {
  const prefix = matchId.split("_")[0];
  const routing = MATCH_REGION_ROUTING[prefix];
  if (!routing) {
    throw new ValidationError(
      `Unrecognized match region prefix "${prefix}" in match id "${matchId}".`
    );
  }
  return routing;
}

interface RiotParticipant {
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
  win: boolean;
}

interface RiotMatchResponse {
  metadata: { matchId: string };
  info: {
    gameCreation: number;
    participants: RiotParticipant[];
  };
}

async function fetchMatch(matchId: string, apiKey: string): Promise<RiotMatchResponse> {
  const routing = routingForMatchId(matchId);
  const res = await fetch(
    `https://${routing}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}`,
    { headers: { "X-Riot-Token": apiKey } }
  );

  if (!res.ok) {
    throw new ValidationError(
      `Riot API request for match ${matchId} failed with status ${res.status}.`
    );
  }

  return (await res.json()) as RiotMatchResponse;
}

/**
 * Fetches champion-level stats for the matches listed in RIOT_TRACKED_MATCH_IDS.
 * Each participant in each match becomes one NormalizedStatRow, keyed by the
 * champion's name (matched against Champion.riotKey at ingestion time).
 */
export async function fetchChampionMatchStats(input: {
  since?: Date;
}): Promise<NormalizedStatRow[]> {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    throw new ValidationError("Riot API key is not configured.");
  }

  if (RIOT_TRACKED_MATCH_IDS.length === 0) {
    return [];
  }

  const rows: NormalizedStatRow[] = [];

  for (const matchId of RIOT_TRACKED_MATCH_IDS) {
    const match = await fetchMatch(matchId, apiKey);
    const gameDate = new Date(match.info.gameCreation);

    if (input.since && gameDate < input.since) continue;

    for (const participant of match.info.participants) {
      rows.push({
        externalGameId: match.metadata.matchId,
        externalKey: participant.championName,
        gameDate,
        kills: participant.kills,
        deaths: participant.deaths,
        assists: participant.assists,
        cs: participant.totalMinionsKilled + participant.neutralMinionsKilled,
        visionScore: participant.visionScore,
        win: participant.win,
        raw: participant,
      });
    }
  }

  return rows;
}

export const riotProvider: StatsProvider = {
  source: "RIOT",
  fetchRawStats: fetchChampionMatchStats,
};
