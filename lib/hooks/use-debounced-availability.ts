"use client";

import { useEffect, useState } from "react";

export type AvailabilityStatus = "idle" | "checking" | "available" | "taken";

/**
 * Debounces a value and calls `checkFn` against the server once it settles,
 * ignoring a stale in-flight response if the value changes again before it
 * resolves. Below `minLength`, the status is always "idle" (no network call).
 */
export function useDebouncedAvailability(
  value: string,
  checkFn: (value: string) => Promise<{ available: boolean }>,
  { minLength = 2, delayMs = 500 }: { minLength?: number; delayMs?: number } = {}
): AvailabilityStatus {
  const [result, setResult] = useState<AvailabilityStatus>("idle");
  const tooShort = value.trim().length < minLength;

  useEffect(() => {
    if (tooShort) return;

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      setResult("checking");
      checkFn(value)
        .then((res) => {
          if (!cancelled) setResult(res.available ? "available" : "taken");
        })
        .catch(() => {
          if (!cancelled) setResult("idle");
        });
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [value, tooShort, delayMs, checkFn]);

  return tooShort ? "idle" : result;
}
