import "server-only";
import { prisma } from "@/lib/db/prisma";
import { DraftStatus } from "@/lib/generated/prisma/enums";
import { NotFoundError } from "@/lib/errors/app-error";
import {
  getNextPosition,
  getOnClockMembershipId,
  getOverallPickNumber,
  isDraftComplete,
} from "@/lib/draft/engine";
import { ensureSeasonScheduled } from "@/lib/leagues/start-season";
import type { Draft } from "@/lib/generated/prisma/client";

/** Draft.draftOrder is stored as Json; it's always a flat array of membershipId strings. */
export function parseDraftOrder(draftOrder: unknown): string[] {
  if (!Array.isArray(draftOrder)) return [];
  return draftOrder.filter((entry): entry is string => typeof entry === "string");
}

function turnDeadline(draft: Draft): Date | null {
  if (!draft.turnStartedAt) return null;
  return new Date(draft.turnStartedAt.getTime() + draft.turnDurationSec * 1000);
}

function isTurnExpired(draft: Draft, now: Date): boolean {
  if (draft.status !== DraftStatus.IN_PROGRESS) return false;
  const deadline = turnDeadline(draft);
  if (!deadline) return false;
  return now.getTime() > deadline.getTime();
}

/**
 * Timer expiry means "skip this turn", not "auto-pick". If the current turn has
 * blown past its deadline, advance the draft position with no pick recorded. This is
 * done as a version-guarded conditional update so concurrent requests racing to
 * perform the same skip only let one of them through. Loops in case multiple turns
 * expired back-to-back (e.g. nobody was online for a while).
 */
export async function autoSkipExpiredTurns(
  leagueId: string,
  draft: Draft,
  teamCount: number,
  rosterSize: number
): Promise<Draft> {
  let current = draft;
  const now = new Date();

  // Bound the loop by the number of remaining picks so a pathological state can
  // never spin forever.
  let guard = teamCount * rosterSize + 1;

  while (guard-- > 0 && isTurnExpired(current, now)) {
    const next = getNextPosition({
      round: current.currentRound,
      currentPickIndex: current.currentPickIndex,
      teamCount,
    });
    const complete = isDraftComplete({ round: next.round, teamCount, rosterSize });

    const result = await prisma.draft.updateMany({
      where: { id: current.id, version: current.version },
      data: {
        version: { increment: 1 },
        currentRound: next.round,
        currentPickIndex: next.currentPickIndex,
        turnStartedAt: complete ? current.turnStartedAt : now,
        status: complete ? DraftStatus.COMPLETED : DraftStatus.IN_PROGRESS,
      },
    });

    if (result.count === 0) {
      // Someone else already advanced this draft — re-read and re-evaluate.
      const fresh = await prisma.draft.findUnique({ where: { leagueId } });
      if (!fresh) throw new NotFoundError("Draft not found.");
      current = fresh;
      continue;
    }

    const fresh = await prisma.draft.findUnique({ where: { leagueId } });
    if (!fresh) throw new NotFoundError("Draft not found.");
    current = fresh;

    if (complete && result.count > 0) {
      await ensureSeasonScheduled(leagueId);
    }
  }

  return current;
}

export type DraftPickView = {
  pickNumber: number;
  round: number;
  membershipId: string;
  draftableId: string;
  draftableName: string;
};

export type DraftStateView = {
  status: DraftStatus;
  version: number;
  currentRound: number;
  currentPickNumber: number;
  onClockMembershipId: string | null;
  turnDeadline: string | null;
  picks: DraftPickView[];
  takenDraftableIds: string[];
};

function draftableDisplayName(draftable: {
  proPlayer: { name: string } | null;
  champion: { name: string } | null;
}): string {
  return draftable.proPlayer?.name ?? draftable.champion?.name ?? "Unknown";
}

/**
 * Reads the draft's current DB state as-is (no auto-skip mutation) and serializes it
 * into the shape both the initial server-rendered snapshot and the poll endpoint
 * share. Safe to call from a Server Component during render since it never writes.
 */
export async function getDraftSnapshot(leagueId: string): Promise<DraftStateView> {
  const draft = await prisma.draft.findUnique({ where: { leagueId } });
  if (!draft) throw new NotFoundError("Draft has not been started yet.");

  const draftOrder = parseDraftOrder(draft.draftOrder);
  const teamCount = draftOrder.length;

  const picks = await prisma.draftPick.findMany({
    where: { draftId: draft.id },
    orderBy: { pickNumber: "asc" },
    include: {
      draftable: { include: { proPlayer: true, champion: true } },
    },
  });

  const onClockMembershipId =
    draft.status === DraftStatus.IN_PROGRESS && teamCount > 0
      ? getOnClockMembershipId(draftOrder, draft.currentRound, draft.currentPickIndex)
      : null;

  return {
    status: draft.status,
    version: draft.version,
    currentRound: draft.currentRound,
    currentPickNumber:
      teamCount > 0
        ? getOverallPickNumber(draftOrder, draft.currentRound, draft.currentPickIndex)
        : 0,
    onClockMembershipId,
    turnDeadline:
      draft.status === DraftStatus.IN_PROGRESS ? turnDeadline(draft)?.toISOString() ?? null : null,
    picks: picks.map((p) => ({
      pickNumber: p.pickNumber,
      round: p.round,
      membershipId: p.membershipId,
      draftableId: p.draftableId,
      draftableName: draftableDisplayName(p.draftable),
    })),
    takenDraftableIds: picks.map((p) => p.draftableId),
  };
}

/**
 * Loads the full, fresh state for a league's draft — after first resolving any
 * expired turns. Throws NotFoundError if no draft exists yet. This is the version
 * used by the polling endpoint and the pick endpoint, where side effects (skipping
 * expired turns) are appropriate.
 */
export async function getFreshDraftState(leagueId: string): Promise<DraftStateView> {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) throw new NotFoundError("League not found.");

  const draft = await prisma.draft.findUnique({ where: { leagueId } });
  if (!draft) throw new NotFoundError("Draft has not been started yet.");

  const draftOrder = parseDraftOrder(draft.draftOrder);
  const teamCount = draftOrder.length;

  if (draft.status === DraftStatus.IN_PROGRESS && teamCount > 0) {
    await autoSkipExpiredTurns(leagueId, draft, teamCount, league.rosterSize);
  }

  return getDraftSnapshot(leagueId);
}
