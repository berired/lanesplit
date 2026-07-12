import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "gold" | "danger" | "success";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-border/50 text-foreground",
  accent: "bg-accent/15 text-accent",
  gold: "bg-gold/15 text-gold",
  danger: "bg-danger/15 text-danger",
  success: "bg-success/15 text-success",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
