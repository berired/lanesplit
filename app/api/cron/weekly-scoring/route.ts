import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { toStatus, toUserMessage } from "@/lib/errors/app-error";
import { computeWeeklyScores } from "@/lib/stats/scoring";
import { MatchupStatus } from "@/lib/generated/prisma/enums";

/**
 * Cron-callable endpoint that computes weekly fantasy scores from already
 * imported RawStatEntry data. Pure computation over existing data — safe to
 * run repeatedly (computeWeeklyScores upserts WeeklyScore rows).
 */
export async function GET(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret");
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: { message: "Unauthorized." } }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const leagueId = url.searchParams.get("leagueId");
    const weekId = url.searchParams.get("weekId");

    let targets: { leagueId: string; weekId: string }[];

    if (leagueId && weekId) {
      targets = [{ leagueId, weekId }];
    } else {
      const dueWeeks = await prisma.seasonWeek.findMany({
        where: {
          endsAt: { lte: new Date() },
          matchups: { some: { status: { not: MatchupStatus.FINAL } } },
        },
        select: { id: true, leagueId: true },
      });
      targets = dueWeeks.map((w) => ({ leagueId: w.leagueId, weekId: w.id }));
    }

    const results = [];
    for (const target of targets) {
      const { updated } = await computeWeeklyScores(target.leagueId, target.weekId);
      results.push({ leagueId: target.leagueId, weekId: target.weekId, updated });
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: { message: toUserMessage(error) } },
      { status: toStatus(error) }
    );
  }
}
