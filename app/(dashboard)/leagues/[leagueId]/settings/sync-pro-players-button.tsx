"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface SyncResult {
  added: number;
  updated: number;
  teamsSynced: number;
}

export function SyncProPlayersButton({ leagueId }: { leagueId: string }) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setIsSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sync-pro-players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? "Couldn't sync players from Riot's esports feed. Please try again.");
        return;
      }
      setResult(data as SyncResult);
      router.refresh();
    } catch {
      setError("Couldn't sync players from Riot's esports feed. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update roster (pro players)</CardTitle>
        <CardDescription>
          Pull current rosters for LCS/LEC/LCK/LPL from Riot&apos;s esports data feed and add or
          update players in the draftable pool, pricing each one by their team&apos;s real
          win rate this split. Tracked leagues live in lib/draftables/tracked-leagues.ts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={handleSync} disabled={isSyncing} variant="secondary">
          {isSyncing ? "Syncing…" : "Update roster from Riot"}
        </Button>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        {result && (
          <div className="rounded-lg border border-border bg-surface-raised p-3 text-sm">
            <p>
              Added <span className="font-medium">{result.added}</span>, updated{" "}
              <span className="font-medium">{result.updated}</span> player
              {result.added + result.updated === 1 ? "" : "s"} across{" "}
              <span className="font-medium">{result.teamsSynced}</span> teams.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
