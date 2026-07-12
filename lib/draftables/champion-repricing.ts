import "server-only";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { GameMode } from "@/lib/generated/prisma/enums";
import { baseCostForRole, priceForWinRate } from "@/lib/draftables/pricing";

export interface ChampionRepriceResult {
  repriced: number;
  noData: number;
}

/**
 * Recomputes champion prices from real, per-game win/loss data already
 * ingested into RawStatEntry (source "RIOT" — see lib/stats/providers/riot-provider.ts
 * and lib/stats/riot-tracked-matches.ts for how that data gets populated).
 * A champion with zero ingested games keeps its current price rather than
 * being reset to a default — no data isn't the same as a 0% win rate.
 */
export async function repriceChampionsFromMatchStats(): Promise<ChampionRepriceResult> {
  const entries = await prisma.rawStatEntry.findMany({
    where: { source: "RIOT", draftable: { gameMode: GameMode.CHAMPION } },
    select: { draftableId: true, win: true },
  });

  const statsByDraftable = new Map<string, { wins: number; total: number }>();
  for (const entry of entries) {
    const bucket = statsByDraftable.get(entry.draftableId) ?? { wins: 0, total: 0 };
    bucket.total += 1;
    if (entry.win) bucket.wins += 1;
    statsByDraftable.set(entry.draftableId, bucket);
  }

  const champions = await prisma.champion.findMany({
    select: { primaryRole: true, draftable: { select: { id: true } } },
  });

  let repriced = 0;
  let noData = 0;

  for (const champion of champions) {
    if (!champion.draftable) continue;
    const bucket = statsByDraftable.get(champion.draftable.id);
    if (!bucket || bucket.total === 0) {
      noData++;
      continue;
    }

    const winRate = bucket.wins / bucket.total;
    const cost = priceForWinRate(baseCostForRole(champion.primaryRole), winRate);
    await prisma.draftable.update({ where: { id: champion.draftable.id }, data: { cost } });
    repriced++;
  }

  if (repriced > 0) {
    revalidateTag("draftables", { expire: 0 });
  }

  return { repriced, noData };
}
