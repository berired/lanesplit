import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/ui/public-header";
import { NavBar } from "@/components/ui/nav-bar";
import { PublicFooter } from "@/components/ui/public-footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "How to play" };

const HOW_TO_STEPS = [
  {
    title: "Create a league",
    steps: [
      "Sign up (or log in), then go to your dashboard and click “Create a league.”",
      "Give the league a name and pick your own team name.",
      "Choose a game mode — Pro Players or Champions — and set the max number of teams and everyone's starting budget.",
      "You're the commissioner. Share the invite code shown on the league page with your friends.",
    ],
  },
  {
    title: "Join a league",
    steps: [
      "Get the invite code from whoever created the league.",
      "From your dashboard, click “Join a league.”",
      "Enter the invite code and pick your own team name.",
      "You're in — you'll show up in the league once the commissioner starts the draft.",
    ],
  },
];

const TUTORIAL_SECTIONS = [
  {
    title: "The basics",
    description:
      "A Lanesplit league runs in three phases: draft, season, and standings. Everyone in a league drafts a personal roster, that roster is scored automatically every week from real match data, and the league tracks head-to-head records all season — just like fantasy football, but for League of Legends.",
  },
  {
    title: "Your roster: one pick per role",
    description:
      "Every roster mirrors a real match — exactly 5 spots: Top, Jungle, Mid, ADC, and Support. You can't draft two junglers or skip a role; once you've filled a role, the draft won't let you pick another player or champion for it. That also means the draft always runs exactly 5 rounds.",
  },
  {
    title: "The live snake draft",
    description:
      "When the commissioner starts the draft, the app randomly sets a draft order and everyone takes turns picking. It's a snake draft: the order reverses each round (1st pick in round 1 picks last in round 2), so no single team gets every early pick. Each team gets a set amount of time per turn — if the clock runs out, that turn is skipped with no pick made, so keep an eye on it. Once every team has filled all 5 roles, the draft ends and the season schedule is generated automatically.",
  },
  {
    title: "Salary cap: every player has a price",
    description:
      "Every league starts with a budget (set by the commissioner when the league is created — the default is $10,000,000) that's the same for every team. Each player or champion costs a set amount to draft, and that cost comes straight out of your budget — star picks cost more, so you can't just draft the 5 best players and ignore the cap. Spend carefully: if you run low on budget, you may not be able to afford anyone left for a role you still need.",
  },
  {
    title: "Weekly matchups & scoring",
    description:
      "Once the draft is done, the app builds a round-robin schedule: every week you're matched head-to-head against a different team in your league. Your roster's fantasy points that week are added up automatically from real match stats and compared against your opponent's — higher score wins. Standings track your record and total points across the whole season.",
  },
];

const GAME_MODES = [
  {
    tone: "gold" as const,
    title: "Pro Player mode",
    description:
      "You draft real professional League of Legends players from leagues like LCS, LEC, and LCK. Each week, your roster is scored from those players' actual competitive match stats — kills, deaths, assists, CS, vision score, and wins. If your drafted mid laner pops off in a real match, you get the points.",
  },
  {
    tone: "accent" as const,
    title: "Champion mode",
    description:
      "You draft League of Legends champions instead of players. Each week, a champion's score comes from how that champion performed across tracked professional games — same underlying stats (kills, deaths, assists, CS, vision, wins), just attributed to the champion rather than the player who picked it.",
  },
];

export default async function HowToPlayPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      {user ? (
        <NavBar displayName={user.displayName} isAdmin={user.isAdmin} />
      ) : (
        <PublicHeader />
      )}

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-16">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-accent">
            Getting started
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            How Lanesplit works
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted text-pretty">
            Everything you need to create your first league, join a friend&apos;s,
            and understand how the draft and scoring actually work.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#how-to">
              <Button variant="secondary" size="sm">
                Jump to: How to
              </Button>
            </a>
            <a href="#tutorial">
              <Button variant="secondary" size="sm">
                Jump to: Tutorial
              </Button>
            </a>
          </div>
        </section>

        <section id="how-to" className="border-t border-border bg-surface/40 scroll-mt-6">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <h2 className="text-2xl font-semibold tracking-tight">How to</h2>
            <p className="mt-2 text-muted">Create a league, or join one with an invite code.</p>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {HOW_TO_STEPS.map((section) => (
                <Card key={section.title}>
                  <CardHeader>
                    <CardTitle>{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-3">
                      {section.steps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                            {i + 1}
                          </span>
                          <span className="text-muted">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="tutorial" className="scroll-mt-6">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <h2 className="text-2xl font-semibold tracking-tight">Tutorial</h2>
            <p className="mt-2 text-muted">
              How fantasy drafting works in Lanesplit, and what each game mode means.
            </p>

            <div className="mt-8 space-y-4">
              {TUTORIAL_SECTIONS.map((section) => (
                <Card key={section.title}>
                  <CardHeader>
                    <CardTitle>{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted text-pretty">{section.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <h3 className="mt-12 text-lg font-semibold tracking-tight">Game modes</h3>
            <p className="mt-2 text-muted">
              Each league picks one mode when it&apos;s created — every team in that
              league drafts from the same pool.
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {GAME_MODES.map((mode) => (
                <Card key={mode.title}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>{mode.title}</CardTitle>
                      <Badge tone={mode.tone}>
                        {mode.tone === "gold" ? "Pro players" : "Champions"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted text-pretty">{mode.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Customizing scoring</CardTitle>
                <CardDescription>
                  Every league&apos;s commissioner can adjust how much each stat is worth.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted text-pretty">
                  From the league&apos;s Settings page, the commissioner sets points-per-unit
                  for kills, deaths, assists, CS, vision score, and wins — deaths can be
                  set as a penalty (a negative value). Changes apply to future weeks, so a
                  league can tune its own scoring to match how it likes to play.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-t border-border bg-surface/40">
          <div className="mx-auto flex max-w-4xl flex-col items-start gap-4 px-6 py-16 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Ready to draft?</h2>
              <p className="mt-1 text-muted">Create a league or join one with an invite code.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/signup">
                <Button>Start a league</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary">I already have an account</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
