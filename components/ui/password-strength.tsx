"use client";

import { PASSWORD_RULES } from "@/lib/validation/password-rules";
import { cn } from "@/lib/cn";

export function PasswordStrength({ password }: { password: string }) {
  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              met ? "text-success" : "text-muted"
            )}
          >
            <span
              className={cn(
                "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border text-[9px] leading-none",
                met ? "border-success bg-success/15" : "border-border"
              )}
              aria-hidden="true"
            >
              {met ? "✓" : ""}
            </span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
