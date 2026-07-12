"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DraftablePoolEntry } from "@/lib/draftables/pool";

type DraftPickView = {
  pickNumber: number;
  round: number;
  membershipId: string;
  draftableId: string;
  draftableName: string;
};

type DraftStateView = {
  status: "PENDING" | "IN_PROGRESS" | "PAUSED" | "COMPLETED";
  version: number;
  currentRound: number;
  currentPickNumber: number;
  onClockMembershipId: string | null;
  turnDeadline: string | null;
  picks: DraftPickView[];
  takenDraftableIds: string[];
};

type TeamRef = { id: string; teamName: string };

const POLL_INTERVAL_MS = 2500;

export function DraftRoom({
  leagueId,
  viewerMembershipId,
  teams,
  pool,
  initialState,
}: {
  leagueId: string;
  viewerMembershipId: string;
  teams: TeamRef[];
  pool: DraftablePoolEntry[];
  initialState: DraftStateView;
}) {
  const [state, setState] = useState<DraftStateView>(initialState);
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null); // draftableId being submitted
  const stateVersionRef = useRef(initialState.version);

  const teamsById = new Map(teams.map((t) => [t.id, t.teamName]));

  // 1s ticker for the countdown display only — never hits the network.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // 2.5s poll — cancels the in-flight request if a new tick starts first.
  useEffect(() => {
    if (state.status === "COMPLETED") return;

    let cancelled = false;
    let controller: AbortController | null = null;

    async function poll() {
      controller = new AbortController();
      try {
        const res = await fetch(`/api/leagues/${leagueId}/draft/state`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) return; // transient errors: just try again next tick
        const data: DraftStateView = await res.json();
        if (cancelled) return;
        if (data.version !== stateVersionRef.current) {
          stateVersionRef.current = data.version;
          setState(data);
        }
      } catch {
        // Aborted or network hiccup — the next tick will retry.
      }
    }

    const id = setInterval(poll, POLL_INTERVAL_MS);
    poll();

    return () => {
      cancelled = true;
      controller?.abort();
      clearInterval(id);
    };
  }, [leagueId, state.status]);

  const handlePick = useCallback(
    async (draftableId: string) => {
      setMessage(null);
      setPending(draftableId);
      try {
        const res = await fetch(`/api/leagues/${leagueId}/draft/pick`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ membershipId: viewerMembershipId, draftableId }),
        });
        if (res.status === 409) {
          setMessage("That pick was already taken — refreshing…");
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setMessage(body?.error?.message ?? "Couldn't submit that pick. Please try again.");
          return;
        }
        // Success — let the next poll tick reconcile the authoritative state.
      } catch {
        setMessage("Couldn't submit that pick — check your connection and try again.");
      } finally {
        setPending(null);
      }
    },
    [leagueId, viewerMembershipId]
  );

  if (state.status === "COMPLETED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Draft complete!</CardTitle>
          <CardDescription>
            Every team has finished picking. Head to your roster to see who you landed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`/leagues/${leagueId}/roster`}>
            <Button>View your roster</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const takenSet = new Set(state.takenDraftableIds);
  const available = pool.filter((p) => !takenSet.has(p.draftableId));
  const isViewerOnClock = state.onClockMembershipId === viewerMembershipId;
  const secondsLeft = state.turnDeadline
    ? Math.max(0, Math.round((new Date(state.turnDeadline).getTime() - now) / 1000))
    : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted">
                Round {state.currentRound} · Pick {state.currentPickNumber}
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight">
                {isViewerOnClock
                  ? "You're on the clock"
                  : `${
                      state.onClockMembershipId
                        ? teamsById.get(state.onClockMembershipId) ?? "Unknown team"
                        : "Nobody"
                    } is on the clock`}
              </p>
            </div>
            {secondsLeft !== null && (
              <Badge tone={secondsLeft <= 10 ? "danger" : "accent"}>{secondsLeft}s left</Badge>
            )}
          </CardContent>
        </Card>

        {message && (
          <div className="rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm text-muted">
            {message}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Available pool</CardTitle>
            <CardDescription>
              {isViewerOnClock
                ? "Click a name to draft it."
                : "Only the team on the clock can make a pick right now."}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[28rem] overflow-y-auto">
            {available.length === 0 ? (
              <p className="text-sm text-muted">Nothing left in the pool.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {available.map((entry) => (
                  <button
                    key={entry.draftableId}
                    type="button"
                    disabled={!isViewerOnClock || pending === entry.draftableId}
                    onClick={() => handlePick(entry.draftableId)}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm transition-colors enabled:hover:bg-border/30 disabled:opacity-50"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{entry.name}</span>
                      {entry.team && <span className="text-muted"> · {entry.team}</span>}
                    </span>
                    <Badge tone="neutral">{entry.role}</Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Pick history</CardTitle>
          <CardDescription>Most recent picks first.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[36rem] space-y-2 overflow-y-auto">
          {state.picks.length === 0 ? (
            <p className="text-sm text-muted">No picks yet.</p>
          ) : (
            [...state.picks]
              .reverse()
              .map((pick) => (
                <div
                  key={pick.pickNumber}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{pick.draftableName}</p>
                    <p className="truncate text-xs text-muted">
                      {teamsById.get(pick.membershipId) ?? "Unknown team"} · R{pick.round}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">#{pick.pickNumber}</span>
                </div>
              ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
