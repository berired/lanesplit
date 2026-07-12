import { notFound } from "next/navigation";
import { requireLeagueMember } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { GameMode } from "@/lib/generated/prisma/enums";
import { getDraftablePool, type DraftablePoolEntry } from "@/lib/draftables/pool";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCompactUsd } from "@/lib/format/currency";
import { PlayerFilters } from "./filters";

type SortKey = "name-asc" | "name-desc" | "role-asc" | "cost-asc" | "cost-desc";

function sortPool(pool: DraftablePoolEntry[], sort: SortKey): DraftablePoolEntry[] {
  const sorted = [...pool];
  switch (sort) {
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "role-asc":
      return sorted.sort(
        (a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name)
      );
    case "cost-asc":
      return sorted.sort((a, b) => a.cost - b.cost);
    case "cost-desc":
      return sorted.sort((a, b) => b.cost - a.cost);
    case "name-asc":
    default:
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export default async function PlayersPage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ q?: string; role?: string; team?: string; sort?: string }>;
}) {
  const { leagueId } = await params;
  await requireLeagueMember(leagueId);

  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) notFound();

  const { q, role, team, sort } = await searchParams;

  const pool = await getDraftablePool(league.gameMode);

  const roles = Array.from(new Set(pool.map((p) => p.role))).sort();
  const teams = Array.from(
    new Set(pool.map((p) => p.team).filter((t): t is string => Boolean(t)))
  ).sort();

  const query = (q ?? "").trim().toLowerCase();
  let filtered = pool;
  if (query) {
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(query));
  }
  if (role) {
    filtered = filtered.filter((p) => p.role === role);
  }
  if (team) {
    filtered = filtered.filter((p) => p.team === team);
  }

  const sortKey: SortKey =
    sort === "name-desc" || sort === "role-asc" || sort === "cost-asc" || sort === "cost-desc"
      ? sort
      : "name-asc";
  const results = sortPool(filtered, sortKey);

  const isProMode = league.gameMode === GameMode.PRO_PLAYER;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          {isProMode ? "Pro player pool" : "Champion pool"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Browse the full {isProMode ? "pro player" : "champion"} pool for this league.
        </p>
      </div>

      <PlayerFilters roles={roles} teams={teams} showTeamFilter={isProMode} />

      {pool.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted">
              No {isProMode ? "pro players" : "champions"} are in the pool yet. Check
              back once the reference data has been seeded.
            </p>
          </CardContent>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted">
              No results match your filters. Try clearing the search or filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((entry) => (
            <Card key={entry.draftableId}>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{entry.name}</p>
                  {entry.team && (
                    <p className="truncate text-sm text-muted">
                      {entry.team}
                      {entry.league ? ` · ${entry.league}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge tone="gold">{formatCompactUsd(entry.cost)}</Badge>
                  <Badge tone="accent">{entry.role}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
