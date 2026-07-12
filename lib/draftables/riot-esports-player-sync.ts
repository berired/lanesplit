import "server-only";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { GameMode } from "@/lib/generated/prisma/enums";
import { ValidationError } from "@/lib/errors/app-error";
import { type Role } from "@/lib/draft/roles";
import { TRACKED_LEAGUES } from "@/lib/draftables/tracked-leagues";
import { baseCostForRole, priceForWinRate } from "@/lib/draftables/pricing";
import { getTeamWinRates } from "@/lib/draftables/riot-standings";

/**
 * Syncs the ProPlayer draftable pool from Riot's own esports data API — the
 * same feed lolesports.com's website runs on. This is NOT an officially
 * documented or supported public API: there's no key-issuance process, and
 * the `x-api-key` below is a long-standing static value baked into
 * lolesports.com's own frontend bundle that the community has treated as a
 * de facto open key for years. It could change or be revoked without notice,
 * unlike an officially issued key — but unlike Leaguepedia/Liquipedia, it has
 * no anonymous rate limit in practice and returns every league's rosters in
 * a single request, so it's a much more practical fit for this app.
 *
 * Pricing: each player's cost is their role's base price scaled by their
 * team's real win rate this split (from getTeamWinRates) — a team with no
 * win rate data (offseason, newly promoted, name mismatch) prices at a
 * neutral 50% win rate rather than failing the whole sync.
 */

const ESPORTS_API_URL = "https://esports-api.lolesports.com/persisted/gw/getTeams?hl=en-US";
const ESPORTS_API_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z";
const NEUTRAL_WIN_RATE = 0.5;

const RIOT_ROLE_TO_APP_ROLE: Record<string, Role> = {
  top: "TOP",
  jungle: "JUNGLE",
  mid: "MID",
  bottom: "ADC",
  support: "SUPPORT",
};

interface RiotEsportsPlayer {
  summonerName: string;
  role: string;
}

interface RiotEsportsTeam {
  name: string;
  status: string;
  homeLeague?: { name: string };
  players: RiotEsportsPlayer[];
}

export interface ProPlayerSyncResult {
  added: number;
  updated: number;
  teamsSynced: number;
}

export async function syncProPlayersFromRiotEsports(): Promise<ProPlayerSyncResult> {
  const [res, winRates] = await Promise.all([
    fetch(ESPORTS_API_URL, { headers: { "x-api-key": ESPORTS_API_KEY }, cache: "no-store" }),
    getTeamWinRates(),
  ]);
  if (!res.ok) {
    throw new ValidationError("Couldn't reach Riot's esports data feed. Please try again.");
  }

  const payload = (await res.json()) as { data?: { teams?: RiotEsportsTeam[] } };
  const allTeams = payload.data?.teams ?? [];

  const teams = allTeams.filter(
    (t) =>
      t.status === "active" &&
      t.players.length > 0 &&
      t.homeLeague?.name &&
      TRACKED_LEAGUES.includes(t.homeLeague.name)
  );

  const existing = await prisma.proPlayer.findMany({
    select: { id: true, name: true, externalRefId: true, draftable: { select: { id: true } } },
  });
  // externalRefId is the real unique key (and, going forward, always equals the
  // Riot summonerName) — match on it first. Name is only a fallback for legacy
  // rows (e.g. hand-seeded placeholders) that haven't been synced under this
  // convention yet; once matched once, their externalRefId gets fixed up and
  // every later run matches by externalRefId cleanly.
  const existingByExternalRefId = new Map(
    existing.filter((p) => p.externalRefId).map((p) => [p.externalRefId as string, p])
  );
  const existingByName = new Map(existing.map((p) => [p.name, p]));

  let added = 0;
  let updated = 0;

  for (const team of teams) {
    const league = team.homeLeague!.name;
    const winRate = winRates.get(team.name) ?? NEUTRAL_WIN_RATE;

    for (const player of team.players) {
      const role = RIOT_ROLE_TO_APP_ROLE[player.role];
      if (!role) continue; // "none" and any other non-playing role

      const cost = priceForWinRate(baseCostForRole(role), winRate);
      const match =
        existingByExternalRefId.get(player.summonerName) ??
        existingByName.get(player.summonerName);

      if (match) {
        await prisma.proPlayer.update({
          where: { id: match.id },
          data: { team: team.name, role, league, externalRefId: player.summonerName },
        });
        if (match.draftable) {
          await prisma.draftable.update({ where: { id: match.draftable.id }, data: { cost } });
        }
        // Keep both lookup maps in sync so a later duplicate summonerName in this
        // same run (rare, but possible across regions) resolves to this same row
        // instead of trying to create a second one.
        existingByExternalRefId.set(player.summonerName, match);
        existingByName.set(player.summonerName, match);
        updated++;
        continue;
      }

      const created = await prisma.proPlayer.create({
        data: {
          name: player.summonerName,
          team: team.name,
          role,
          league,
          externalRefId: player.summonerName,
        },
      });
      const draftable = await prisma.draftable.create({
        data: { gameMode: GameMode.PRO_PLAYER, proPlayerId: created.id, cost },
      });
      const record = {
        id: created.id,
        name: created.name,
        externalRefId: player.summonerName,
        draftable,
      };
      existingByExternalRefId.set(player.summonerName, record);
      existingByName.set(created.name, record);
      added++;
    }
  }

  if (added > 0 || updated > 0) {
    revalidateTag("draftables", { expire: 0 });
  }

  return { added, updated, teamsSynced: teams.length };
}
