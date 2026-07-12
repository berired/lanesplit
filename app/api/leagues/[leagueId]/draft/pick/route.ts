import { NextResponse } from "next/server";
import { requireLeagueMemberApi } from "@/lib/auth/api-dal";
import { prisma } from "@/lib/db/prisma";
import { DraftStatus } from "@/lib/generated/prisma/enums";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  NotYourTurnError,
  toStatus,
  toUserMessage,
} from "@/lib/errors/app-error";
import {
  getNextPosition,
  getOnClockMembershipId,
  getOverallPickNumber,
  isDraftComplete,
} from "@/lib/draft/engine";
import { autoSkipExpiredTurns, parseDraftOrder } from "@/lib/draft/service";
import { ensureSeasonScheduled } from "@/lib/leagues/start-season";

type PickBody = {
  membershipId?: unknown;
  draftableId?: unknown;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  try {
    const membership = await requireLeagueMemberApi(leagueId);

    const body = (await request.json().catch(() => ({}))) as PickBody;
    const membershipId = typeof body.membershipId === "string" ? body.membershipId : null;
    const draftableId = typeof body.draftableId === "string" ? body.draftableId : null;

    if (!membershipId || !draftableId) {
      throw new ConflictError("A membershipId and draftableId are required.");
    }

    // Can't pick for someone else — the caller's own membership is the only one that
    // can act on their behalf, regardless of what the client claims.
    if (membership.id !== membershipId) {
      throw new ForbiddenError("You can't make a pick for another team.");
    }

    const [league, draftRow] = await Promise.all([
      prisma.league.findUnique({ where: { id: leagueId } }),
      prisma.draft.findUnique({ where: { leagueId } }),
    ]);
    if (!league) throw new NotFoundError("League not found.");
    if (!draftRow) throw new NotFoundError("Draft has not been started yet.");
    let draft = draftRow;

    if (draft.status !== DraftStatus.IN_PROGRESS) {
      throw new ConflictError("The draft isn't currently active.");
    }

    const draftOrder = parseDraftOrder(draft.draftOrder);
    const teamCount = draftOrder.length;
    if (teamCount === 0) {
      throw new ConflictError("This draft has no team order configured.");
    }

    // Resolve any turns that have already timed out before evaluating this pick. If
    // this causes the turn to move, the caller's request is now stale — tell them to
    // re-poll rather than let them pick against an out-of-date turn.
    const resolvedDraft = await autoSkipExpiredTurns(leagueId, draft, teamCount, league.rosterSize);
    if (resolvedDraft.version !== draft.version) {
      throw new ConflictError("Your turn timed out — refreshing…");
    }
    draft = resolvedDraft;

    if (draft.status !== DraftStatus.IN_PROGRESS) {
      throw new ConflictError("The draft isn't currently active.");
    }

    const expectedOnClock = getOnClockMembershipId(
      draftOrder,
      draft.currentRound,
      draft.currentPickIndex
    );
    if (expectedOnClock !== membershipId) {
      throw new NotYourTurnError();
    }

    const draftable = await prisma.draftable.findUnique({ where: { id: draftableId } });
    if (!draftable || draftable.gameMode !== league.gameMode) {
      throw new ConflictError("That pick isn't valid for this league.");
    }

    const existingPick = await prisma.draftPick.findUnique({
      where: { draftId_draftableId: { draftId: draft.id, draftableId } },
    });
    if (existingPick) {
      throw new ConflictError("That pick has already been taken.");
    }

    const pickNumber = getOverallPickNumber(draftOrder, draft.currentRound, draft.currentPickIndex);
    const next = getNextPosition({
      round: draft.currentRound,
      currentPickIndex: draft.currentPickIndex,
      teamCount,
    });
    const complete = isDraftComplete({ round: next.round, teamCount, rosterSize: league.rosterSize });
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      const advanced = await tx.draft.updateMany({
        where: { id: draft!.id, version: draft!.version },
        data: {
          version: { increment: 1 },
          currentRound: next.round,
          currentPickIndex: next.currentPickIndex,
          turnStartedAt: complete ? draft!.turnStartedAt : now,
          status: complete ? DraftStatus.COMPLETED : DraftStatus.IN_PROGRESS,
        },
      });

      if (advanced.count === 0) {
        throw new ConflictError("Someone else just picked — refreshing…");
      }

      await tx.draftPick.create({
        data: {
          draftId: draft!.id,
          round: draft!.currentRound,
          pickNumber,
          membershipId,
          draftableId,
          madeByUserId: membership.userId,
        },
      });

      await tx.rosterEntry.upsert({
        where: { membershipId_draftableId: { membershipId, draftableId } },
        create: { membershipId, draftableId, isStarter: true },
        update: {},
      });
    });

    if (complete) {
      await ensureSeasonScheduled(leagueId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // A racing request may have created the DraftPick/RosterEntry between our
    // pre-check and the transaction — the DB's unique constraints are the real
    // backstop, so surface that as a conflict rather than a raw 500.
    if (!(error instanceof AppError) && isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: { message: "That pick has already been taken." } },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: { message: toUserMessage(error) } },
      { status: toStatus(error) }
    );
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
