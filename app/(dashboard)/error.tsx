"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-surface px-6 py-16 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-danger">
        Couldn&apos;t load this
      </p>
      <h2 className="text-xl font-semibold tracking-tight">Something went wrong.</h2>
      <p className="max-w-sm text-muted">
        Please try again. Your other leagues and data are unaffected.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
