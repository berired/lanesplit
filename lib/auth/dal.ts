import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getSessionPayload } from "@/lib/auth/session";
import { LeagueRole } from "@/lib/generated/prisma/enums";

/**
 * Verifies the session cookie. Memoized per-request via React `cache()`.
 * This — not proxy.ts — is the actual authorization boundary.
 */
export const verifySession = cache(async () => {
  const session = await getSessionPayload();
  if (!session) return null;
  return { userId: session.userId };
});

export async function requireUser() {
  const session = await verifySession();
  if (!session) redirect("/login");
  return session;
}

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, displayName: true },
  });
});

/**
 * Confirms the current user belongs to the league. Returns notFound() rather than
 * a 403 so membership (and the league's existence to non-members) isn't leaked.
 * Memoized per-request/per-leagueId so the layout and every leaf page under it
 * can each call this defensively without paying for repeat round-trips.
 */
export const requireLeagueMember = cache(async (leagueId: string) => {
  const { userId } = await requireUser();

  const membership = await prisma.leagueMembership.findUnique({
    where: { leagueId_userId: { leagueId, userId } },
  });

  if (!membership) notFound();
  return membership;
});

export const requireCommissioner = cache(async (leagueId: string) => {
  const membership = await requireLeagueMember(leagueId);
  if (membership.role !== LeagueRole.COMMISSIONER) {
    redirect(`/leagues/${leagueId}`);
  }
  return membership;
});
