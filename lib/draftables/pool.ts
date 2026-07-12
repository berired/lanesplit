import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { GameMode } from "@/lib/generated/prisma/enums";

export type DraftablePoolEntry = {
  draftableId: string;
  gameMode: GameMode;
  name: string;
  /** ProPlayer role/team/league or Champion's primary role — display metadata only. */
  role: string;
  team: string | null;
  league: string | null;
  /** Salary-cap draft cost in whole USD. */
  cost: number;
};

/**
 * Returns the full draftable pool for a game mode (pro players or champions), joined
 * to their display info. Pool sizes are small (a few hundred rows at most) and this
 * data changes rarely, so it's cached for a few hours and tagged for on-demand
 * invalidation. Does not accept searchParams — filtering/sorting happens in-memory
 * in the (dynamic) page component that calls this.
 */
export async function getDraftablePool(gameMode: GameMode): Promise<DraftablePoolEntry[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("draftables");

  const draftables = await prisma.draftable.findMany({
    where: { gameMode },
    include: { proPlayer: true, champion: true },
  });

  return draftables
    .map((d): DraftablePoolEntry | null => {
      if (d.proPlayer) {
        return {
          draftableId: d.id,
          gameMode: d.gameMode,
          name: d.proPlayer.name,
          role: d.proPlayer.role,
          team: d.proPlayer.team,
          league: d.proPlayer.league,
          cost: d.cost,
        };
      }
      if (d.champion) {
        return {
          draftableId: d.id,
          gameMode: d.gameMode,
          name: d.champion.name,
          role: d.champion.primaryRole,
          team: null,
          league: null,
          cost: d.cost,
        };
      }
      return null;
    })
    .filter((entry): entry is DraftablePoolEntry => entry !== null);
}
