import { NextResponse } from "next/server";
import { requireLeagueMemberApi } from "@/lib/auth/api-dal";
import { toStatus, toUserMessage } from "@/lib/errors/app-error";
import { getFreshDraftState } from "@/lib/draft/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  try {
    await requireLeagueMemberApi(leagueId);
    const state = await getFreshDraftState(leagueId);
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      { error: { message: toUserMessage(error) } },
      { status: toStatus(error) }
    );
  }
}
