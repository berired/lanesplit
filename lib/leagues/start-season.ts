import "server-only";
import { prisma } from "@/lib/db/prisma";
import { generateRoundRobinSchedule } from "@/lib/leagues/schedule";

/**
 * Persists a league's round-robin schedule the first time its draft completes.
 * Idempotent: if SeasonWeek rows already exist for the league, does nothing, so
 * it's safe to call from every place a Draft can transition to COMPLETED
 * (the pick route's own completion, and autoSkipExpiredTurns's timer-driven one).
 */
export async function ensureSeasonScheduled(leagueId: string): Promise<void> {
  const existingWeek = await prisma.seasonWeek.findFirst({
    where: { leagueId },
    select: { id: true },
  });
  if (existingWeek) return;

  const memberships = await prisma.leagueMembership.findMany({
    where: { leagueId },
    select: { id: true },
  });
  if (memberships.length < 2) return;

  const weeks = generateRoundRobinSchedule(
    memberships.map((m) => m.id),
    new Date()
  );

  for (const week of weeks) {
    await prisma.seasonWeek.create({
      data: {
        leagueId,
        weekNumber: week.weekNumber,
        startsAt: week.startsAt,
        endsAt: week.endsAt,
        matchups: {
          create: week.matchups.map((m) => ({
            leagueId,
            homeMembershipId: m.homeMembershipId,
            awayMembershipId: m.awayMembershipId,
          })),
        },
      },
    });
  }
}
