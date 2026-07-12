"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface SyncResult {
  added: { name: string; guessedRole: string }[];
  totalFromRiot: number;
}

export function SyncChampionsButton({ leagueId }: { leagueId: string }) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setIsSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sync-champions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? "Couldn't sync champions from Riot. Please try again.");
        return;
      }
      setResult(data as SyncResult);
      router.refresh();
    } catch {
      setError("Couldn't sync champions from Riot. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update roster (champions)</CardTitle>
        <CardDescription>
          Pull the current champion list from Riot&apos;s public Data Dragon feed and add any
          new champions to the draftable pool. Existing champions and their roles aren&apos;t
          changed.
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
            {result.added.length === 0 ? (
              <p>Your champion pool is already up to date with Riot&apos;s {result.totalFromRiot} champions.</p>
            ) : (
              <>
                <p>
                  Added <span className="font-medium">{result.added.length}</span> new champion
                  {result.added.length === 1 ? "" : "s"}:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                  {result.added.map((c) => (
                    <li key={c.name}>
                      {c.name} — guessed role <span className="font-medium">{c.guessedRole}</span>
                      , double-check it on the Players page
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
