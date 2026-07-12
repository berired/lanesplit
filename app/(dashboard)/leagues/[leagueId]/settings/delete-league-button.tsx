"use client";

import { useState, useTransition } from "react";
import { deleteLeague } from "@/lib/actions/leagues";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function DeleteLeagueButton({ leagueId, leagueName }: { leagueId: string; leagueName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteLeague(leagueId);
      } catch {
        setError("Couldn't delete this league. Please try again.");
      }
    });
  }

  return (
    <Card className="border-danger/40">
      <CardHeader>
        <CardTitle>Danger zone</CardTitle>
        <CardDescription>
          Permanently delete &ldquo;{leagueName}&rdquo; — every membership, the draft, rosters,
          schedule, and standings go with it. This can&apos;t be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!confirming ? (
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Delete league
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-danger">
              Are you sure? This will permanently delete the league for everyone in it.
            </p>
            <div className="flex gap-3">
              <Button variant="danger" onClick={handleDelete} disabled={isPending}>
                {isPending ? "Deleting…" : "Yes, delete this league"}
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
