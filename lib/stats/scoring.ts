import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors/app-error";
import { MatchupStatus } from "@/lib/generated/prisma/enums";

const STAT_KEYS = ["kills", "deaths", "assists", "cs", "visionScore", "win"] as const;
type StatKey = (typeof STAT_KEYS)[number];

/**
 * Computes and persists WeeklyScore rows (and the corresponding Matchup scores)
 * for a given league + week, from already-imported RawStatEntry rows.
 * A missing ScoringRule for any statKey defaults its pointsPerUnit to 0 rather
 * than crashing, since a league may not have configured all 6 keys yet.
 */
export async function computeWeeklyScores(
  leagueId: string,
  weekId: string
): Promise<{ updated: number }> {
  const week = await prisma.seasonWeek.findUnique({ where: { id: weekId } });
  if (!week || week.leagueId !== leagueId) {
    throw new NotFoundError("We couldn't find that season week for this league.");
  }

  const [rosterEntries, scoringRules] = await Promise.all([
    prisma.rosterEntry.findMany({
      where: { membership: { leagueId } },
      select: { id: true, membershipId: true, draftableId: true },
    }),
    prisma.scoringRule.findMany({ where: { leagueId } }),
  ]);

  const pointsPerUnit: Record<StatKey, number> = {
    kills: 0,
    deaths: 0,
    assists: 0,
    cs: 0,
    visionScore: 0,
    win: 0,
  };
  for (const rule of scoringRules) {
    if ((STAT_KEYS as readonly string[]).includes(rule.statKey)) {
      pointsPerUnit[rule.statKey as StatKey] = rule.pointsPerUnit;
    }
  }

  const draftableIds = [...new Set(rosterEntries.map((e) => e.draftableId))];
  const allStats = await prisma.rawStatEntry.findMany({
    where: {
      draftableId: { in: draftableIds },
      gameDate: { gte: week.startsAt, lte: week.endsAt },
    },
    select: {
      draftableId: true,
      kills: true,
      deaths: true,
      assists: true,
      cs: true,
      visionScore: true,
      win: true,
    },
  });

  const statsByDraftable = new Map<string, typeof allStats>();
  for (const stat of allStats) {
    const bucket = statsByDraftable.get(stat.draftableId);
    if (bucket) bucket.push(stat);
    else statsByDraftable.set(stat.draftableId, [stat]);
  }

  const membershipTotals = new Map<string, number>();

  const weeklyScoreWrites = rosterEntries.map((entry) => {
    const stats = statsByDraftable.get(entry.draftableId) ?? [];

    const totals = stats.reduce(
      (acc, s) => {
        acc.kills += s.kills;
        acc.deaths += s.deaths;
        acc.assists += s.assists;
        acc.cs += s.cs;
        acc.visionScore += s.visionScore;
        acc.wins += s.win ? 1 : 0;
        return acc;
      },
      { kills: 0, deaths: 0, assists: 0, cs: 0, visionScore: 0, wins: 0 }
    );

    const points =
      totals.kills * pointsPerUnit.kills +
      totals.deaths * pointsPerUnit.deaths +
      totals.assists * pointsPerUnit.assists +
      totals.cs * pointsPerUnit.cs +
      totals.visionScore * pointsPerUnit.visionScore +
      totals.wins * pointsPerUnit.win;

    membershipTotals.set(
      entry.membershipId,
      (membershipTotals.get(entry.membershipId) ?? 0) + points
    );

    return prisma.weeklyScore.upsert({
      where: { rosterEntryId_weekId: { rosterEntryId: entry.id, weekId } },
      create: { rosterEntryId: entry.id, weekId, points },
      update: { points },
    });
  });

  await Promise.all(weeklyScoreWrites);
  const updated = weeklyScoreWrites.length;

  const matchups = await prisma.matchup.findMany({ where: { leagueId, weekId } });
  const isFinal = week.endsAt.getTime() <= Date.now();

  await Promise.all(
    matchups.map((matchup) => {
      const homeScore = membershipTotals.get(matchup.homeMembershipId) ?? 0;
      const awayScore = membershipTotals.get(matchup.awayMembershipId) ?? 0;

      return prisma.matchup.update({
        where: { id: matchup.id },
        data: {
          homeScore,
          awayScore,
          ...(isFinal ? { status: MatchupStatus.FINAL } : {}),
        },
      });
    })
  );

  return { updated };
}
