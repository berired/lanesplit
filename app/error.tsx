"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-danger">
        Something went wrong
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        We hit a snag loading this page.
      </h1>
      <p className="max-w-sm text-muted">
        Please try again. If this keeps happening, let us know what you were
        doing beforehand.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
