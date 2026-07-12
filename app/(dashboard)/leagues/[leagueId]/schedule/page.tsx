import { requireLeagueMember } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MATCHUP_STATUS_TONE } from "@/lib/matchups/status-tone";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  await requireLeagueMember(leagueId);

  const weeks = await prisma.seasonWeek.findMany({
    where: { leagueId },
    orderBy: { weekNumber: "asc" },
    include: {
      matchups: {
        include: {
          homeMembership: { select: { teamName: true } },
          awayMembership: { select: { teamName: true } },
        },
      },
    },
  });

  if (weeks.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted">
          The schedule will be generated once your draft is complete.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {weeks.map((week) => (
        <Card key={week.id}>
          <CardHeader>
            <CardTitle className="text-base">Week {week.weekNumber}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {week.matchups.length === 0 ? (
              <p className="text-sm text-muted">No matchups this week.</p>
            ) : (
              week.matchups.map((matchup) => (
                <div
                  key={matchup.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-4 py-2.5"
                >
                  <p className="text-sm font-medium">
                    {matchup.homeMembership.teamName}
                    {matchup.homeScore != null ? ` (${matchup.homeScore})` : ""} vs{" "}
                    {matchup.awayMembership.teamName}
                    {matchup.awayScore != null ? ` (${matchup.awayScore})` : ""}
                  </p>
                  <Badge tone={MATCHUP_STATUS_TONE[matchup.status]}>{matchup.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
