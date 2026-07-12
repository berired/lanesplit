import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLeagueMember } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type RosterEntryWithDraftable = {
  id: string;
  isStarter: boolean;
  draftable: {
    proPlayer: { name: string; role: string; team: string } | null;
    champion: { name: string; primaryRole: string } | null;
  };
};

function displayName(entry: RosterEntryWithDraftable) {
  return entry.draftable.proPlayer?.name ?? entry.draftable.champion?.name ?? "Unknown";
}

function displayMeta(entry: RosterEntryWithDraftable) {
  if (entry.draftable.proPlayer) {
    return `${entry.draftable.proPlayer.role} · ${entry.draftable.proPlayer.team}`;
  }
  if (entry.draftable.champion) {
    return entry.draftable.champion.primaryRole;
  }
  return "";
}

function RosterGroup({
  title,
  items,
}: {
  title: string;
  items: RosterEntryWithDraftable[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium uppercase tracking-widest text-muted">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{displayName(entry)}</p>
                <p className="truncate text-sm text-muted">{displayMeta(entry)}</p>
              </div>
              <Badge tone={entry.isStarter ? "success" : "neutral"}>
                {entry.isStarter ? "Starter" : "Bench"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default async function RosterPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const membership = await requireLeagueMember(leagueId);

  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) notFound();

  const entries = await prisma.rosterEntry.findMany({
    where: { membershipId: membership.id },
    include: { draftable: { include: { proPlayer: true, champion: true } } },
    orderBy: { acquiredAt: "asc" },
  });

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No roster yet</CardTitle>
          <CardDescription>
            {"You don't have any players on your roster yet — that happens once the draft has been run."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`/leagues/${leagueId}/draft`}>
            <Button>Go to the draft room</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const starters = entries.filter((e) => e.isStarter);
  const bench = entries.filter((e) => !e.isStarter);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{membership.teamName}</h2>
        <p className="mt-1 text-sm text-muted">Your roster for {league.name}.</p>
      </div>

      <RosterGroup title="Starters" items={starters} />
      <RosterGroup title="Bench" items={bench} />
    </div>
  );
}
