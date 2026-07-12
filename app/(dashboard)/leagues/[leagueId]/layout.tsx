import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLeagueMember } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { GameMode, LeagueRole } from "@/lib/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { CopyInviteCode } from "./copy-invite-code";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/standings", label: "Standings" },
  { href: "/schedule", label: "Schedule" },
  { href: "/draft", label: "Draft" },
  { href: "/roster", label: "Roster" },
  { href: "/players", label: "Players" },
];

export default function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ leagueId: string }>;
}) {
  return (
    <Suspense fallback={<LeagueChromeSkeleton />}>
      <LeagueChrome params={params}>{children}</LeagueChrome>
    </Suspense>
  );
}

async function LeagueChrome({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const membership = await requireLeagueMember(leagueId);

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
  });

  if (!league) notFound();

  const isCommissioner = membership.role === LeagueRole.COMMISSIONER;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{league.name}</h1>
          <Badge tone={league.gameMode === GameMode.PRO_PLAYER ? "gold" : "accent"}>
            {league.gameMode === GameMode.PRO_PLAYER ? "Pro players" : "Champions"}
          </Badge>
        </div>
        <CopyInviteCode inviteCode={league.inviteCode} />
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.label}
            href={`/leagues/${leagueId}${tab.href}`}
            className={cn(
              "rounded-t-lg px-3 py-2 text-sm font-medium text-muted transition-colors",
              "hover:bg-border/20 hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
        {isCommissioner && (
          <Link
            href={`/leagues/${leagueId}/settings`}
            className="rounded-t-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-border/20 hover:text-foreground"
          >
            Settings
          </Link>
        )}
      </nav>

      {children}
    </div>
  );
}

function LeagueChromeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-48 animate-pulse rounded-md bg-border/50" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-border/50" />
      </div>
      <div className="h-9 w-full animate-pulse rounded-md bg-border/30" />
    </div>
  );
}
