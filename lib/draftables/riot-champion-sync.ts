import "server-only";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { GameMode } from "@/lib/generated/prisma/enums";
import { ValidationError } from "@/lib/errors/app-error";
import { ROLES, type Role } from "@/lib/draft/roles";

/**
 * Syncs the Champion draftable pool from Riot's public Data Dragon feed
 * (no API key required — this is static reference data, unrelated to the
 * rate-limited/expiring match-v5 key used by lib/stats/providers/riot-provider.ts).
 *
 * Data Dragon's champion.json has no lane/role field (that's an esports/meta
 * concept Riot doesn't publish), only class "tags" like Marksman/Support/Mage/
 * Fighter/Tank/Assassin. New champions are added with a best-effort role guess
 * derived from those tags — flagged clearly in the result so a commissioner can
 * correct it from the Players page if it's wrong. Existing champions are left
 * untouched (their role may already be commissioner-curated).
 */

const DDRAGON_VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";

interface RiotChampionEntry {
  id: string; // Riot's internal champion key, matches Champion.riotKey
  name: string;
  tags: string[];
}

const TAG_ROLE_GUESS: Record<string, Role> = {
  Marksman: "ADC",
  Support: "SUPPORT",
  Mage: "MID",
  Assassin: "MID",
  Fighter: "TOP",
  Tank: "TOP",
};

function guessRole(tags: string[]): Role {
  for (const tag of tags) {
    const guess = TAG_ROLE_GUESS[tag];
    if (guess) return guess;
  }
  return ROLES[0];
}

export interface ChampionSyncResult {
  added: { name: string; guessedRole: Role }[];
  totalFromRiot: number;
}

export async function syncChampionsFromRiot(): Promise<ChampionSyncResult> {
  const versionsRes = await fetch(DDRAGON_VERSIONS_URL, { cache: "no-store" });
  if (!versionsRes.ok) {
    throw new ValidationError("Couldn't reach Riot's Data Dragon service. Please try again.");
  }
  const versions: unknown = await versionsRes.json();
  const latest = Array.isArray(versions) ? versions[0] : undefined;
  if (typeof latest !== "string") {
    throw new ValidationError("Riot's Data Dragon didn't return a usable game version.");
  }

  const champsRes = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${latest}/data/en_US/champion.json`,
    { cache: "no-store" }
  );
  if (!champsRes.ok) {
    throw new ValidationError("Couldn't fetch the champion list from Riot. Please try again.");
  }
  const payload = (await champsRes.json()) as { data?: Record<string, RiotChampionEntry> };
  const entries = Object.values(payload.data ?? {});

  const existing = await prisma.champion.findMany({ select: { riotKey: true } });
  const existingKeys = new Set(existing.map((c) => c.riotKey));

  const added: { name: string; guessedRole: Role }[] = [];

  for (const entry of entries) {
    if (existingKeys.has(entry.id)) continue;

    const guessedRole = guessRole(entry.tags ?? []);
    const champion = await prisma.champion.create({
      data: { name: entry.name, riotKey: entry.id, primaryRole: guessedRole },
    });
    await prisma.draftable.create({
      data: { gameMode: GameMode.CHAMPION, championId: champion.id },
    });
    added.push({ name: entry.name, guessedRole });
  }

  if (added.length > 0) {
    // Immediate expiration (not the "max" stale-while-revalidate profile) since the
    // commissioner triggering this expects to see the new champions right away.
    revalidateTag("draftables", { expire: 0 });
  }

  return { added, totalFromRiot: entries.length };
}
