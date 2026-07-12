"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface SyncResult {
  imported: number;
  skipped: number;
  errors: string[];
  repriced: number;
  noData: number;
  message?: string;
}

export function SyncMatchStatsButton({ leagueId }: { leagueId: string }) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setIsSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sync-riot-match-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? "Couldn't sync match stats. Please try again.");
        return;
      }
      setResult(data as SyncResult);
      router.refresh();
    } catch {
      setError("Couldn't sync match stats. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reprice champions by win rate</CardTitle>
        <CardDescription>
          Pulls real per-game stats for the matches listed in
          lib/stats/riot-tracked-matches.ts (Riot&apos;s match-v5 API) and reprices every
          champion with data from its actual win rate this data covers. Champions with no
          tracked games keep their current price.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={handleSync} disabled={isSyncing} variant="secondary">
          {isSyncing ? "Syncing…" : "Sync match stats & reprice"}
        </Button>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        {result?.message && <p className="text-sm text-muted">{result.message}</p>}

        {result && !result.message && (
          <div className="rounded-lg border border-border bg-surface-raised p-3 text-sm">
            <p>
              Imported <span className="font-medium">{result.imported}</span> stat row
              {result.imported === 1 ? "" : "s"}, repriced{" "}
              <span className="font-medium">{result.repriced}</span> champion
              {result.repriced === 1 ? "" : "s"} ({result.noData} with no tracked games left
              unchanged).
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
