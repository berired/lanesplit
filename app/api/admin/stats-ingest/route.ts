import { NextResponse } from "next/server";
import { requireCommissionerApi } from "@/lib/auth/api-dal";
import { ValidationError, toStatus, toUserMessage } from "@/lib/errors/app-error";
import { parseOraclesElixirCsv } from "@/lib/stats/providers/oracles-elixir-provider";
import { ingestNormalizedRows } from "@/lib/stats/ingest";

/**
 * Commissioner-triggered CSV upload endpoint for Oracle's Elixir stat exports.
 * There is no live Oracle's Elixir API, so this manual upload is the v1 import
 * path (see lib/stats/providers/oracles-elixir-provider.ts for details).
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const leagueId = formData.get("leagueId");
    const file = formData.get("file");

    if (typeof leagueId !== "string" || !leagueId) {
      throw new ValidationError("A leagueId is required.");
    }
    if (!(file instanceof File)) {
      throw new ValidationError("A CSV file is required.");
    }

    await requireCommissionerApi(leagueId);

    const csvText = await file.text();
    const rows = parseOraclesElixirCsv(csvText);
    const result = await ingestNormalizedRows(rows, "ORACLES_ELIXIR");

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: { message: toUserMessage(error) } },
      { status: toStatus(error) }
    );
  }
}
