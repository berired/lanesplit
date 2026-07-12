import Link from "next/link";
import { requireLeagueMember } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { DraftStatus, LeagueRole, MatchupStatus } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DRAFT_STATUS_LABEL } from "@/lib/draft/labels";
import { MATCHUP_STATUS_TONE } from "@/lib/matchups/status-tone";

export default async function LeagueOverviewPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const membership = await requireLeagueMember(leagueId);

  const [draft, finalMatchups, upcomingMatchup] = await Promise.all([
    prisma.draft.findUnique({ where: { leagueId } }),
    prisma.matchup.findMany({
      where: {
        leagueId,
        status: MatchupStatus.FINAL,
        OR: [{ homeMembershipId: membership.id }, { awayMembershipId: membership.id }],
      },
      include: { week: true },
    }),
    prisma.matchup.findFirst({
      where: {
        leagueId,
        status: MatchupStatus.SCHEDULED,
        OR: [{ homeMembershipId: membership.id }, { awayMembershipId: membership.id }],
      },
      include: {
        week: true,
        homeMembership: { select: { teamName: true } },
        awayMembership: { select: { teamName: true } },
      },
      orderBy: { week: { weekNumber: "asc" } },
    }),
  ]);

  let wins = 0;
  let losses = 0;
  let ties = 0;
  for (const m of finalMatchups) {
    const isHome = m.homeMembershipId === membership.id;
    const mine = isHome ? m.homeScore : m.awayScore;
    const theirs = isHome ? m.awayScore : m.homeScore;
    if (mine == null || theirs == null) continue;
    if (mine > theirs) wins++;
    else if (mine < theirs) losses++;
    else ties++;
  }

  const isCommissioner = membership.role === LeagueRole.COMMISSIONER;
  const showStartDraftCta = !draft && isCommissioner;

  return (
    <div className="space-y-6">
      {showStartDraftCta && (
        <Card className="border-accent/50 bg-accent/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
            <div>
              <h2 className="font-semibold tracking-tight">Ready to draft?</h2>
              <p className="mt-1 text-sm text-muted">
                Start the draft once everyone has joined your league.
              </p>
            </div>
            <Link href={`/leagues/${leagueId}/draft`}>
              <Button>Start the draft</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Draft status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge tone={draft?.status === DraftStatus.COMPLETED ? "success" : "neutral"}>
              {draft ? DRAFT_STATUS_LABEL[draft.status] : "Not started"}
            </Badge>
            {!draft && !isCommissioner && (
              <p className="mt-3 text-sm text-muted">
                The commissioner hasn&apos;t started the draft yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your record</CardTitle>
          </CardHeader>
          <CardContent>
            {finalMatchups.length === 0 ? (
              <p className="text-sm text-muted">No games played yet.</p>
            ) : (
              <p className="text-2xl font-semibold tracking-tight">
                {wins}-{losses}
                {ties > 0 ? `-${ties}` : ""}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming matchup</CardTitle>
          <CardDescription>Your next scheduled game.</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingMatchup ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted">Week {upcomingMatchup.week.weekNumber}</p>
                <p className="font-medium">
                  {upcomingMatchup.homeMembership.teamName} vs{" "}
                  {upcomingMatchup.awayMembership.teamName}
                </p>
              </div>
              <Badge tone={MATCHUP_STATUS_TONE[upcomingMatchup.status]}>
                {upcomingMatchup.status}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted">
              No upcoming matchup scheduled yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
