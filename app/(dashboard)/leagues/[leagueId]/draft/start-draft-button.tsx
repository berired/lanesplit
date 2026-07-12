"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function StartDraftButton({
  leagueId,
  disabled,
}: {
  leagueId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setError(null);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/draft/start`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? "Couldn't start the draft. Please try again.");
        return;
      }
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("Couldn't start the draft. Please try again.");
    }
  }

  return (
    <div>
      <Button onClick={handleStart} disabled={disabled || isPending}>
        {isPending ? "Starting…" : "Start Draft"}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
