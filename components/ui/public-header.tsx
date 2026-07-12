import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Lane<span className="text-accent">split</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/how-to-play">
            <Button variant="ghost" size="sm">
              How to play
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Create account</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
