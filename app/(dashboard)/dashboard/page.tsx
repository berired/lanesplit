import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { GameMode } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DRAFT_STATUS_LABEL } from "@/lib/draft/labels";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <YourLeagues />
    </Suspense>
  );
}

function DashboardPageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-8 w-48 animate-pulse rounded-md bg-border/50" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-surface" />
        ))}
      </div>
    </div>
  );
}

async function YourLeagues() {
  const { userId } = await requireUser();

  const memberships = await prisma.leagueMembership.findMany({
    where: { userId },
    include: {
      league: {
        include: {
          memberships: { select: { id: true } },
          draft: { select: { status: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your leagues</h1>
          <p className="mt-1 text-sm text-muted">
            Manage your fantasy leagues or join a friend&apos;s.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/leagues/join">
            <Button variant="secondary">Join a league</Button>
          </Link>
          <Link href="/leagues/new">
            <Button>Create a league</Button>
          </Link>
        </div>
      </div>

      {memberships.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">No leagues yet</h2>
              <p className="mt-1 text-sm text-muted text-pretty">
                Create a league to start drafting with friends, or join one with an
                invite code.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/leagues/new">
                <Button>Create a league</Button>
              </Link>
              <Link href="/leagues/join">
                <Button variant="secondary">Join a league</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map((membership) => {
            const { league } = membership;
            return (
              <Link key={league.id} href={`/leagues/${league.id}`}>
                <Card className="h-full transition-colors hover:border-accent/60">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle>{league.name}</CardTitle>
                      <Badge tone={league.gameMode === GameMode.PRO_PLAYER ? "gold" : "accent"}>
                        {league.gameMode === GameMode.PRO_PLAYER ? "Pro players" : "Champions"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {league.memberships.length}/{league.maxTeams} teams &middot; your team
                      &ldquo;{membership.teamName}&rdquo;
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-sm">
                    <span className="text-muted">
                      {membership.role === "COMMISSIONER" ? "Commissioner" : "Member"}
                    </span>
                    <Badge tone="neutral">
                      Draft: {league.draft ? DRAFT_STATUS_LABEL[league.draft.status] : "Not started"}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
