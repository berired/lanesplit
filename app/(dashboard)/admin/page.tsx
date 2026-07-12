import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { DraftStatus, GameMode } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DRAFT_STATUS_LABEL } from "@/lib/draft/labels";

export default async function AdminPage() {
  await requireAdmin();

  const [totalUsers, leagues, users] = await Promise.all([
    prisma.user.count(),
    prisma.league.findMany({
      include: {
        commissioner: { select: { displayName: true } },
        memberships: { select: { id: true } },
        draft: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        isAdmin: true,
        createdAt: true,
        _count: { select: { memberships: true, commissionedLeagues: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // A league counts as "active" once its draft has actually started — a league
  // that's just been created with nobody drafted yet isn't really in play.
  const activeLeagues = leagues.filter(
    (league) => league.draft && league.draft.status !== DraftStatus.PENDING
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted">Site-wide overview of users and leagues.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted">Total users</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted">Active leagues</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{activeLeagues}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted">Total leagues</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{leagues.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leagues</CardTitle>
          <CardDescription>Every league in the system, newest first.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {leagues.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">No leagues yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Mode</th>
                    <th className="px-5 py-3 font-medium">Commissioner</th>
                    <th className="px-5 py-3 font-medium">Teams</th>
                    <th className="px-5 py-3 font-medium">Draft</th>
                    <th className="px-5 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {leagues.map((league) => (
                    <tr key={league.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium">{league.name}</td>
                      <td className="px-5 py-3">
                        <Badge tone={league.gameMode === GameMode.PRO_PLAYER ? "gold" : "accent"}>
                          {league.gameMode === GameMode.PRO_PLAYER ? "Pro players" : "Champions"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-muted">{league.commissioner.displayName}</td>
                      <td className="px-5 py-3 text-muted">
                        {league.memberships.length}/{league.maxTeams}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone="neutral">
                          {league.draft ? DRAFT_STATUS_LABEL[league.draft.status] : "Not started"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {league.createdAt.toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Everyone with an account, newest first.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">No users yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Leagues joined</th>
                    <th className="px-5 py-3 font-medium">Commissions</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium">{user.displayName}</td>
                      <td className="px-5 py-3 text-muted">{user.email}</td>
                      <td className="px-5 py-3 text-muted">{user._count.memberships}</td>
                      <td className="px-5 py-3 text-muted">{user._count.commissionedLeagues}</td>
                      <td className="px-5 py-3">
                        {user.isAdmin ? (
                          <Badge tone="gold">Admin</Badge>
                        ) : (
                          <Badge tone="neutral">Member</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {user.createdAt.toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
