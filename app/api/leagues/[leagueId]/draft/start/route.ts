import { NextResponse } from "next/server";
import { requireCommissionerApi } from "@/lib/auth/api-dal";
import { prisma } from "@/lib/db/prisma";
import { DraftStatus } from "@/lib/generated/prisma/enums";
import { ConflictError, ValidationError, toStatus, toUserMessage } from "@/lib/errors/app-error";

const DEFAULT_TURN_DURATION_SEC = 60;

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  try {
    await requireCommissionerApi(leagueId);

    const url = new URL(request.url);
    const turnDurationParam = url.searchParams.get("turnDurationSec");
    const parsedTurnDuration = turnDurationParam ? Number.parseInt(turnDurationParam, 10) : NaN;
    const turnDurationSec = Number.isFinite(parsedTurnDuration) && parsedTurnDuration > 0
      ? parsedTurnDuration
      : DEFAULT_TURN_DURATION_SEC;

    const memberships = await prisma.leagueMembership.findMany({
      where: { leagueId },
      select: { id: true },
    });

    if (memberships.length < 2) {
      throw new ValidationError("A league needs at least 2 members before the draft can start.");
    }

    const draftOrder = shuffle(memberships.map((m) => m.id));
    const now = new Date();

    const existing = await prisma.draft.findUnique({ where: { leagueId } });

    if (existing) {
      if (existing.status !== DraftStatus.PENDING) {
        throw new ConflictError(
          existing.status === DraftStatus.COMPLETED
            ? "This draft has already finished."
            : "The draft is already underway."
        );
      }

      const updated = await prisma.draft.update({
        where: { id: existing.id },
        data: {
          status: DraftStatus.IN_PROGRESS,
          draftOrder,
          currentRound: 1,
          currentPickIndex: 0,
          turnStartedAt: now,
          turnDurationSec,
          version: { increment: 1 },
        },
      });
      return NextResponse.json({ success: true, draftId: updated.id });
    }

    const created = await prisma.draft.create({
      data: {
        leagueId,
        status: DraftStatus.IN_PROGRESS,
        draftOrder,
        currentRound: 1,
        currentPickIndex: 0,
        turnStartedAt: now,
        turnDurationSec,
      },
    });

    return NextResponse.json({ success: true, draftId: created.id });
  } catch (error) {
    return NextResponse.json(
      { error: { message: toUserMessage(error) } },
      { status: toStatus(error) }
    );
  }
}
