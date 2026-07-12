import { notFound } from "next/navigation";
import { requireLeagueMember } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { DraftStatus, LeagueRole } from "@/lib/generated/prisma/enums";
import { getDraftablePool } from "@/lib/draftables/pool";
import { getDraftSnapshot } from "@/lib/draft/service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StartDraftButton } from "./start-draft-button";
import { DraftRoom } from "./draft-room";
import { DraftLobbyWait } from "./draft-lobby-wait";

export default async function DraftPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const membership = await requireLeagueMember(leagueId);

  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) notFound();

  const [draft, memberships, pool] = await Promise.all([
    prisma.draft.findUnique({ where: { leagueId } }),
    prisma.leagueMembership.findMany({
      where: { leagueId },
      select: { id: true, teamName: true },
    }),
    getDraftablePool(league.gameMode),
  ]);

  const isCommissioner = membership.role === LeagueRole.COMMISSIONER;

  if (!draft || draft.status === DraftStatus.PENDING) {
    return (
      <Card>
        <DraftLobbyWait leagueId={leagueId} />
        <CardHeader>
          <CardTitle>Draft hasn&apos;t started yet</CardTitle>
          <CardDescription>
            {isCommissioner
              ? "Kick off the live snake draft whenever your league is ready."
              : "Waiting for the commissioner to start the draft. You'll be taken to the draft room automatically."}
          </CardDescription>
        </CardHeader>
        {isCommissioner && (
          <CardContent>
            <StartDraftButton leagueId={leagueId} disabled={memberships.length < 2} />
            {memberships.length < 2 && (
              <p className="mt-2 text-sm text-muted">
                You need at least 2 members in the league before starting.
              </p>
            )}
          </CardContent>
        )}
      </Card>
    );
  }

  const initialState = await getDraftSnapshot(leagueId);

  return (
    <DraftRoom
      leagueId={leagueId}
      viewerMembershipId={membership.id}
      teams={memberships}
      pool={pool}
      initialState={initialState}
    />
  );
}
