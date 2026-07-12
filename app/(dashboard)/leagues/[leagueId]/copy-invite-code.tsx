"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export function CopyInviteCode({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (e.g. insecure context) — fail silently,
      // the code is still visible for manual copy.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy invite code"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5",
        "font-mono text-sm tracking-widest text-foreground transition-colors hover:bg-border/20"
      )}
    >
      {inviteCode}
      <span className="text-xs font-sans font-medium text-accent">
        {copied ? "Copied!" : "Copy"}
      </span>
    </button>
  );
}
