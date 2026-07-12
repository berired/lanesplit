import "server-only";
import { TRACKED_LEAGUES } from "@/lib/draftables/tracked-leagues";

/**
 * Real team win rates from Riot's public esports data feed — the same
 * unofficial API/key used by the roster sync (see riot-esports-player-sync.ts
 * for the caveats on that key). Used to price pro players by their team's
 * actual current-split record rather than a flat role-based guess.
 */

const ESPORTS_BASE = "https://esports-api.lolesports.com/persisted/gw";
const ESPORTS_API_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z";

async function esportsGet<T>(path: string): Promise<T> {
  const res = await fetch(`${ESPORTS_BASE}/${path}`, {
    headers: { "x-api-key": ESPORTS_API_KEY },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Riot esports API request failed (${res.status}): ${path}`);
  }
  return res.json() as Promise<T>;
}

interface LeagueEntry {
  id: string;
  name: string;
}

interface TournamentEntry {
  id: string;
  startDate: string;
}

interface StandingsTeam {
  name: string;
  record?: { wins: number; losses: number };
}

interface StandingsResponse {
  data?: {
    standings?: {
      stages?: {
        sections?: {
          rankings?: { teams?: StandingsTeam[] }[];
        }[];
      }[];
    }[];
  };
}

async function getLeagueIdsByName(): Promise<Map<string, string>> {
  const payload = await esportsGet<{ data?: { leagues?: LeagueEntry[] } }>(
    "getLeagues?hl=en-US"
  );
  const leagues = payload.data?.leagues ?? [];
  return new Map(leagues.map((l) => [l.name, l.id]));
}

/** The most recently started tournament (split) for a league — "current" in
 * practice, since a split's standings stay meaningful right up until the next
 * one starts. */
async function getCurrentTournamentId(leagueId: string): Promise<string | null> {
  const payload = await esportsGet<{
    data?: { leagues?: { tournaments?: TournamentEntry[] }[] };
  }>(`getTournamentsForLeague?hl=en-US&leagueId=${leagueId}`);
  const tournaments = payload.data?.leagues?.[0]?.tournaments ?? [];

  const now = Date.now();
  const started = tournaments
    .filter((t) => new Date(t.startDate).getTime() <= now)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return started[0]?.id ?? null;
}

async function getTournamentWinRates(tournamentId: string): Promise<Map<string, number>> {
  const payload = await esportsGet<StandingsResponse>(
    `getStandings?hl=en-US&tournamentId=${tournamentId}`
  );
  const stages = payload.data?.standings?.[0]?.stages ?? [];

  const result = new Map<string, number>();
  for (const stage of stages) {
    for (const section of stage.sections ?? []) {
      for (const ranking of section.rankings ?? []) {
        for (const team of ranking.teams ?? []) {
          const record = team.record;
          if (!record) continue;
          const total = record.wins + record.losses;
          if (total > 0) result.set(team.name, record.wins / total);
        }
      }
    }
  }
  return result;
}

/**
 * Real win rates (0-1) per team name, across every league in TRACKED_LEAGUES,
 * from each league's most recently started split. A league with no started
 * split yet (e.g. offseason) just contributes nothing — callers should treat a
 * missing team as "no data" and fall back to a neutral price, not an error.
 */
export async function getTeamWinRates(): Promise<Map<string, number>> {
  const leagueIds = await getLeagueIdsByName();
  const combined = new Map<string, number>();

  for (const leagueName of TRACKED_LEAGUES) {
    const leagueId = leagueIds.get(leagueName);
    if (!leagueId) continue;

    const tournamentId = await getCurrentTournamentId(leagueId);
    if (!tournamentId) continue;

    const winRates = await getTournamentWinRates(tournamentId);
    for (const [team, rate] of winRates) combined.set(team, rate);
  }

  return combined;
}
