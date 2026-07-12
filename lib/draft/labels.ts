import { DraftStatus } from "@/lib/generated/prisma/enums";

export const DRAFT_STATUS_LABEL: Record<DraftStatus, string> = {
  [DraftStatus.PENDING]: "Not started",
  [DraftStatus.IN_PROGRESS]: "In progress",
  [DraftStatus.PAUSED]: "Paused",
  [DraftStatus.COMPLETED]: "Completed",
};
