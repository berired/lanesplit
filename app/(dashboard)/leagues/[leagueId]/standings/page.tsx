import { requireLeagueMember } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { MatchupStatus } from "@/lib/generated/prisma/enums";
import { Card, CardContent } from "@/components/ui/card";

interface StandingsRow {
  membershipId: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
}

export default async function StandingsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  await requireLeagueMember(leagueId);

  const memberships = await prisma.leagueMembership.findMany({
    where: { leagueId },
    select: {
      id: true,
      teamName: true,
      homeMatchups: {
        where: { status: MatchupStatus.FINAL },
        select: { homeScore: true, awayScore: true },
      },
      awayMatchups: {
        where: { status: MatchupStatus.FINAL },
        select: { homeScore: true, awayScore: true },
      },
    },
  });

  const hasAnyFinal = memberships.some(
    (m) => m.homeMatchups.length > 0 || m.awayMatchups.length > 0
  );

  const rows: StandingsRow[] = memberships.map((m) => {
    let wins = 0;
    let losses = 0;
    let ties = 0;
    let pointsFor = 0;

    for (const match of m.homeMatchups) {
      if (match.homeScore == null || match.awayScore == null) continue;
      pointsFor += match.homeScore;
      if (match.homeScore > match.awayScore) wins++;
      else if (match.homeScore < match.awayScore) losses++;
      else ties++;
    }
    for (const match of m.awayMatchups) {
      if (match.homeScore == null || match.awayScore == null) continue;
      pointsFor += match.awayScore;
      if (match.awayScore > match.homeScore) wins++;
      else if (match.awayScore < match.homeScore) losses++;
      else ties++;
    }

    return { membershipId: m.id, teamName: m.teamName, wins, losses, ties, pointsFor };
  });

  rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return b.pointsFor - a.pointsFor;
  });

  if (!hasAnyFinal) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted">
          Standings will appear once the season starts.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-5 py-3 font-medium">Team</th>
              <th className="px-5 py-3 font-medium">W-L</th>
              <th className="px-5 py-3 font-medium">Points For</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.membershipId} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">{row.teamName}</td>
                <td className="px-5 py-3">
                  {row.wins}-{row.losses}
                  {row.ties > 0 ? `-${row.ties}` : ""}
                </td>
                <td className="px-5 py-3">{row.pointsFor.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
