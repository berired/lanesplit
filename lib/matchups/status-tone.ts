import { MatchupStatus } from "@/lib/generated/prisma/enums";

export const MATCHUP_STATUS_TONE: Record<MatchupStatus, "neutral" | "accent" | "success"> = {
  [MatchupStatus.SCHEDULED]: "neutral",
  [MatchupStatus.IN_PROGRESS]: "accent",
  [MatchupStatus.FINAL]: "success",
};
