import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function NavBar({ displayName }: { displayName: string }) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          Rift <span className="text-accent">Draft</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted sm:inline">{displayName}</span>
          <form action={logout}>
            <Button type="submit" variant="secondary" size="sm">
              Log out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function NavBarSkeleton() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <span className="text-lg font-semibold tracking-tight">
          Rift <span className="text-accent">Draft</span>
        </span>
        <div className="h-8 w-20 animate-pulse rounded-md bg-border/50" />
      </div>
    </header>
  );
}
