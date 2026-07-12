import { NextResponse } from "next/server";
import { requireCommissionerApi } from "@/lib/auth/api-dal";
import { AppError, ValidationError, toStatus, toUserMessage } from "@/lib/errors/app-error";
import { syncProPlayersFromRiotEsports } from "@/lib/draftables/riot-esports-player-sync";

/**
 * Commissioner-triggered sync of the (global) ProPlayer draftable pool from
 * Riot's esports data feed. Scoped through a specific league's commissioner
 * check purely as an access-control mechanism — there is no site-wide admin
 * role in this app — but the effect (new/updated ProPlayer/Draftable rows)
 * is shared across every league.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { leagueId?: unknown };
    const leagueId = body.leagueId;

    if (typeof leagueId !== "string" || !leagueId) {
      throw new ValidationError("A leagueId is required.");
    }

    await requireCommissionerApi(leagueId);

    const result = await syncProPlayersFromRiotEsports();
    return NextResponse.json(result);
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error("sync-pro-players failed:", error);
    }
    return NextResponse.json(
      { error: { message: toUserMessage(error) } },
      { status: toStatus(error) }
    );
  }
}
