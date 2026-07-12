import { notFound } from "next/navigation";
import { requireCommissioner } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { GameMode } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScoringRulesForm } from "./scoring-rules-form";
import { SyncChampionsButton } from "./sync-champions-button";
import { SyncProPlayersButton } from "./sync-pro-players-button";
import { SyncMatchStatsButton } from "./sync-match-stats-button";
import { DeleteLeagueButton } from "./delete-league-button";
import { ROLES } from "@/lib/draft/roles";
import { formatUsd } from "@/lib/format/currency";

export default async function LeagueSettingsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  // Defense in depth: the layout already hides this tab from non-commissioners,
  // but the page must enforce authorization itself.
  await requireCommissioner(leagueId);

  const [league, scoringRules] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId } }),
    prisma.scoringRule.findMany({ where: { leagueId } }),
  ]);
  if (!league) notFound();

  const initialValues = Object.fromEntries(
    scoringRules.map((rule) => [rule.statKey, rule.pointsPerUnit])
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>League info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted">Name</p>
            <p className="font-medium">{league.name}</p>
          </div>
          <div>
            <p className="text-muted">Invite code</p>
            <p className="font-mono font-medium tracking-widest">{league.inviteCode}</p>
          </div>
          <div>
            <p className="text-muted">Max teams</p>
            <p className="font-medium">{league.maxTeams}</p>
          </div>
          <div>
            <p className="text-muted">Roster size</p>
            <p className="font-medium">{ROLES.length} ({ROLES.join(" / ")})</p>
          </div>
          <div>
            <p className="text-muted">Starting budget per team</p>
            <p className="font-medium">{formatUsd(league.startingBudget)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scoring rules</CardTitle>
          <CardDescription>
            Points awarded per unit of each stat. Use negative values to penalize
            (e.g. deaths).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScoringRulesForm leagueId={leagueId} initialValues={initialValues} />
        </CardContent>
      </Card>

      {league.gameMode === GameMode.CHAMPION && (
        <>
          <SyncChampionsButton leagueId={leagueId} />
          <SyncMatchStatsButton leagueId={leagueId} />
        </>
      )}
      {league.gameMode === GameMode.PRO_PLAYER && <SyncProPlayersButton leagueId={leagueId} />}

      <DeleteLeagueButton leagueId={leagueId} leagueName={league.name} />
    </div>
  );
}
