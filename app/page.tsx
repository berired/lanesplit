import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    title: "Live snake draft",
    description:
      "Run a real draft with your friends — turn order, a countdown clock, and picks that lock in the instant someone takes them.",
  },
  {
    title: "Pro players or champions",
    description:
      "Pick your league's format: draft real LCS/LEC/LCK pros, or draft champions. Each league chooses one mode.",
  },
  {
    title: "Weekly head-to-head",
    description:
      "Just like fantasy football — your roster is scored against an opponent every week, with standings that track it all season.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">
            Lane<span className="text-accent">split</span>
          </span>
          <nav className="flex items-center gap-3">
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

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-accent">
              Fantasy League of Legends
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Draft your lane, week after week.
            </h1>
            <p className="mt-5 text-lg text-muted text-pretty">
              Create a league, invite your friends, and run a live snake draft of
              pro players or champions. Rosters are scored weekly from real match
              data, so the whole season plays out like fantasy football — but
              for League of Legends.
            </p>
            <div className="mt-8 flex gap-3">
              <Link href="/signup">
                <Button size="lg">Start a league</Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="secondary">
                  I already have an account
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface/40">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title}>
                <CardContent>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted text-pretty">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-muted">
          Not affiliated with Riot Games. Built for friends who argue about draft picks.
        </div>
      </footer>
    </div>
  );
}
