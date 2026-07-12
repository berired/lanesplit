"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/input";

interface IngestSummary {
  imported: number;
  skipped: number;
  errors: string[];
}

/** Stats import form rendered on the commissioner settings page. */
export function StatsImportForm({ leagueId }: { leagueId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<IngestSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSummary(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setErrorMessage("Please choose a CSV file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("leagueId", leagueId);
    formData.append("file", file);

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/stats-ingest", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data?.error?.message ?? "Something went wrong on our end. Please try again in a moment.");
        return;
      }

      setSummary(data as IngestSummary);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setErrorMessage("Something went wrong on our end. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Oracle&apos;s Elixir stats</CardTitle>
        <CardDescription>
          Upload a CSV export from Oracle&apos;s Elixir to import raw pro-player stats.
          Re-uploading the same file is safe — it will not double-count rows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="stats-csv-file">CSV file</Label>
            <input
              id="stats-csv-file"
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-sm text-foreground file:mr-4 file:rounded-lg file:border file:border-border file:bg-surface-raised file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-border/40"
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Importing…" : "Import stats"}
          </Button>

          {errorMessage ? (
            <p className="text-sm text-danger" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {summary ? (
            <div className="rounded-lg border border-border bg-surface-raised p-3 text-sm">
              <p>
                Imported <span className="font-medium">{summary.imported}</span> row(s), skipped{" "}
                <span className="font-medium">{summary.skipped}</span>.
              </p>
              {summary.errors.length > 0 ? (
                <ul className="mt-2 list-disc pl-5 text-muted">
                  {summary.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
