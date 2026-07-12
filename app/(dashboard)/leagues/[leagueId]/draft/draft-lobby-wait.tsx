"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 2000;

/**
 * Renders nothing — just polls for the draft to leave PENDING while everyone
 * waits in the lobby, and refreshes the page the moment the commissioner
 * starts it so all members land on the draft room without a manual reload.
 */
export function DraftLobbyWait({ leagueId }: { leagueId: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/leagues/${leagueId}/draft/state`, {
          cache: "no-store",
        });
        if (cancelled) return;
        // 404 means the draft row doesn't exist yet — still waiting.
        if (!res.ok) return;
        const data: { status?: string } = await res.json();
        if (data.status && data.status !== "PENDING") {
          router.refresh();
        }
      } catch {
        // Network hiccup — the next tick will retry.
      }
    }

    const id = setInterval(poll, POLL_INTERVAL_MS);
    poll();

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [leagueId, router]);

  return null;
}
