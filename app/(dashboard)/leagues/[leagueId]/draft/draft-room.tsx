"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DraftablePoolEntry } from "@/lib/draftables/pool";
import { ROLES, getOpenRoles } from "@/lib/draft/roles";
import { formatCompactUsd, formatUsd } from "@/lib/format/currency";

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
  startingBudget: number;
  spentByMembership: Record<string, number>;
};

type TeamRef = { id: string; teamName: string };

type SortOption = "name" | "cost-asc" | "cost-desc";

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

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");

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
          const body = await res.json().catch(() => null);
          setMessage(body?.error?.message ?? "That pick couldn't be made — refreshing…");
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

  const poolByDraftableId = useMemo(
    () => new Map(pool.map((p) => [p.draftableId, p])),
    [pool]
  );

  const viewerFilledRoles = useMemo(
    () =>
      state.picks
        .filter((p) => p.membershipId === viewerMembershipId)
        .map((p) => poolByDraftableId.get(p.draftableId)?.role)
        .filter((role): role is string => Boolean(role)),
    [state.picks, viewerMembershipId, poolByDraftableId]
  );
  const viewerOpenRoles = getOpenRoles(viewerFilledRoles);

  const viewerSpent = state.spentByMembership[viewerMembershipId] ?? 0;
  const viewerRemaining = state.startingBudget - viewerSpent;

  const isPlayerMode = pool.some((p) => p.team);

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
  // A roster is exactly one pick per role — the pool you can actually draft from is
  // scoped to roles you still need, same as a real match.
  const eligible = pool.filter(
    (p) => !takenSet.has(p.draftableId) && (viewerOpenRoles as string[]).includes(p.role)
  );

  const distinctTeams = isPlayerMode
    ? [...new Set(eligible.map((p) => p.team).filter((t): t is string => Boolean(t)))].sort()
    : [];

  const searchTerm = appliedSearch.trim().toLowerCase();
  const visible = eligible
    .filter((entry) => !searchTerm || entry.name.toLowerCase().includes(searchTerm))
    .filter((entry) => !roleFilter || entry.role === roleFilter)
    .filter((entry) => !teamFilter || entry.team === teamFilter)
    .sort((a, b) => {
      if (sortBy === "cost-asc") return a.cost - b.cost;
      if (sortBy === "cost-desc") return b.cost - a.cost;
      return a.name.localeCompare(b.name);
    });

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
            <CardTitle>Your roster &amp; budget</CardTitle>
            <CardDescription>One pick per role, just like a real match.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => {
                const filled = !viewerOpenRoles.includes(role);
                return (
                  <Badge key={role} tone={filled ? "success" : "neutral"}>
                    {filled ? "✓ " : ""}
                    {role}
                  </Badge>
                );
              })}
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2">
              <span className="text-sm text-muted">Remaining budget</span>
              <span className="text-lg font-semibold tracking-tight">
                {formatUsd(viewerRemaining)}{" "}
                <span className="text-sm font-normal text-muted">
                  / {formatUsd(state.startingBudget)}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available pool</CardTitle>
            <CardDescription>
              {viewerOpenRoles.length === 0
                ? "You've filled every role on your roster."
                : isViewerOnClock
                  ? `Click a name to draft it. Showing roles you still need: ${viewerOpenRoles.join(", ")}.`
                  : `Only the team on the clock can make a pick right now. Showing roles you still need: ${viewerOpenRoles.join(", ")}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  placeholder="Search by name…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setAppliedSearch(searchInput);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAppliedSearch(searchInput)}
              >
                Search
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All roles you need</option>
                {viewerOpenRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>

              {isPlayerMode && (
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All teams</option>
                  {distinctTeams.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="name">Sort: Name (A–Z)</option>
                <option value="cost-asc">Sort: Cost (low to high)</option>
                <option value="cost-desc">Sort: Cost (high to low)</option>
              </select>
            </div>

            <div className="max-h-[24rem] overflow-y-auto">
              {visible.length === 0 ? (
                <p className="text-sm text-muted">
                  {eligible.length === 0
                    ? viewerOpenRoles.length === 0
                      ? "Nothing left to draft — your roster is complete."
                      : "Nothing left in the pool for the roles you still need."
                    : "No players match your filters."}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {visible.map((entry) => {
                    const affordable = entry.cost <= viewerRemaining;
                    return (
                      <button
                        key={entry.draftableId}
                        type="button"
                        disabled={!isViewerOnClock || !affordable || pending === entry.draftableId}
                        title={
                          !affordable
                            ? `You can't afford this — ${formatUsd(viewerRemaining)} remaining`
                            : undefined
                        }
                        onClick={() => handlePick(entry.draftableId)}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm transition-colors enabled:hover:bg-border/30 disabled:opacity-50"
                      >
                        <span className="min-w-0 truncate">
                          <span className="font-medium">{entry.name}</span>
                          {entry.team && <span className="text-muted"> · {entry.team}</span>}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {!affordable && <Badge tone="danger">Can&apos;t afford</Badge>}
                          <Badge tone="gold">{formatCompactUsd(entry.cost)}</Badge>
                          <Badge tone="neutral">{entry.role}</Badge>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Team budgets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {teams.map((team) => {
              const spent = state.spentByMembership[team.id] ?? 0;
              const remaining = state.startingBudget - spent;
              return (
                <div
                  key={team.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className={team.id === viewerMembershipId ? "font-medium" : "text-muted"}>
                    {team.teamName}
                  </span>
                  <span className="text-muted">{formatCompactUsd(remaining)} left</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pick history</CardTitle>
            <CardDescription>Most recent picks first.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[28rem] space-y-2 overflow-y-auto">
            {state.picks.length === 0 ? (
              <p className="text-sm text-muted">No picks yet.</p>
            ) : (
              [...state.picks]
                .reverse()
                .map((pick) => {
                  const cost = poolByDraftableId.get(pick.draftableId)?.cost;
                  return (
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
                      <div className="shrink-0 text-right">
                        {cost !== undefined && (
                          <p className="text-xs text-muted">{formatCompactUsd(cost)}</p>
                        )}
                        <span className="text-xs text-muted">#{pick.pickNumber}</span>
                      </div>
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
