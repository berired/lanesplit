import { NextResponse } from "next/server";
import { requireCommissionerApi } from "@/lib/auth/api-dal";
import { AppError, ValidationError, toStatus, toUserMessage } from "@/lib/errors/app-error";
import { fetchChampionMatchStats } from "@/lib/stats/providers/riot-provider";
import { ingestNormalizedRows } from "@/lib/stats/ingest";
import { repriceChampionsFromMatchStats } from "@/lib/draftables/champion-repricing";
import { RIOT_TRACKED_MATCH_IDS } from "@/lib/stats/riot-tracked-matches";

/**
 * Commissioner-triggered: pulls real per-game champion stats for the matches
 * listed in lib/stats/riot-tracked-matches.ts (Riot's match-v5 API, needs
 * RIOT_API_KEY), ingests them, then reprices every champion with data from
 * its real win rate. There is no live "all recent matches" feed — see
 * riot-provider.ts for why this needs a manually maintained match ID list.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { leagueId?: unknown };
    const leagueId = body.leagueId;

    if (typeof leagueId !== "string" || !leagueId) {
      throw new ValidationError("A leagueId is required.");
    }

    await requireCommissionerApi(leagueId);

    if (RIOT_TRACKED_MATCH_IDS.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped: 0,
        errors: [],
        repriced: 0,
        noData: 0,
        message:
          "No match IDs are configured yet — add some to lib/stats/riot-tracked-matches.ts to pull real match data.",
      });
    }

    const rows = await fetchChampionMatchStats({});
    const ingestResult = await ingestNormalizedRows(rows, "RIOT");
    const repriceResult = await repriceChampionsFromMatchStats();

    return NextResponse.json({ ...ingestResult, ...repriceResult });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error("sync-riot-match-stats failed:", error);
    }
    return NextResponse.json(
      { error: { message: toUserMessage(error) } },
      { status: toStatus(error) }
    );
  }
}
