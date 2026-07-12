import { notFound } from "next/navigation";
import { requireCommissioner } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScoringRulesForm } from "./scoring-rules-form";
import { StatsImportForm } from "./stats-import-form";

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
            <p className="font-medium">{league.rosterSize}</p>
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

      <StatsImportForm leagueId={leagueId} />
    </div>
  );
}
