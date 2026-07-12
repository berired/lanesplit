"use client";

import type { AvailabilityStatus } from "@/lib/hooks/use-debounced-availability";
import { cn } from "@/lib/cn";

export function AvailabilityHint({
  status,
  takenLabel,
  availableLabel,
}: {
  status: AvailabilityStatus;
  takenLabel: string;
  availableLabel: string;
}) {
  if (status === "idle") return null;

  return (
    <p
      className={cn(
        "mt-1.5 text-sm",
        status === "checking" && "text-muted",
        status === "available" && "text-success",
        status === "taken" && "text-danger"
      )}
      role={status === "taken" ? "alert" : "status"}
    >
      {status === "checking" && "Checking…"}
      {status === "available" && `✓ ${availableLabel}`}
      {status === "taken" && takenLabel}
    </p>
  );
}
