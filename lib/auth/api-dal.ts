import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getSessionPayload } from "@/lib/auth/session";
import { LeagueRole } from "@/lib/generated/prisma/enums";
import { UnauthorizedError, NotFoundError, ForbiddenError } from "@/lib/errors/app-error";

/**
 * API-route counterparts to lib/auth/dal.ts. The DAL's requireUser/requireLeagueMember/
 * requireCommissioner call Next's redirect()/notFound(), which are page-navigation
 * primitives — throwing them inside a Route Handler's try/catch just gets swallowed
 * and reported as a generic 500. These throw AppError subclasses instead, which the
 * existing toStatus/toUserMessage mapping in every route handler already understands.
 */

export async function requireUserApi() {
  const session = await getSessionPayload();
  if (!session) throw new UnauthorizedError();
  return { userId: session.userId };
}

export async function requireLeagueMemberApi(leagueId: string) {
  const { userId } = await requireUserApi();

  const membership = await prisma.leagueMembership.findUnique({
    where: { leagueId_userId: { leagueId, userId } },
  });

  if (!membership) throw new NotFoundError("You're not a member of this league.");
  return membership;
}

export async function requireCommissionerApi(leagueId: string) {
  const membership = await requireLeagueMemberApi(leagueId);
  if (membership.role !== LeagueRole.COMMISSIONER) {
    throw new ForbiddenError("Only the league commissioner can do that.");
  }
  return membership;
}
