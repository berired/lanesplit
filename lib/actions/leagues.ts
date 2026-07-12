"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/lib/generated/prisma/client";
import { LeagueRole } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { requireUser, requireCommissioner } from "@/lib/auth/dal";
import { generateInviteCode } from "@/lib/leagues/invite-code";
import {
  CreateLeagueSchema,
  JoinLeagueSchema,
  ScoringRulesArraySchema,
} from "@/lib/validation/league.schema";
import type { ActionResult } from "@/lib/validation/action-result";
import { actionFieldErrors, actionFormError } from "@/lib/validation/action-result";

const DEFAULT_SCORING_RULES: { statKey: string; pointsPerUnit: number }[] = [
  { statKey: "kills", pointsPerUnit: 3 },
  { statKey: "deaths", pointsPerUnit: -1 },
  { statKey: "assists", pointsPerUnit: 2 },
  { statKey: "cs", pointsPerUnit: 0.02 },
  { statKey: "win", pointsPerUnit: 2 },
  { statKey: "visionScore", pointsPerUnit: 0.05 },
];

const MAX_INVITE_CODE_ATTEMPTS = 3;

export async function createLeague(
  _prevState: ActionResult<null> | undefined,
  formData: FormData
): Promise<ActionResult<null>> {
  const validated = CreateLeagueSchema.safeParse({
    name: formData.get("name"),
    teamName: formData.get("teamName"),
    gameMode: formData.get("gameMode"),
    maxTeams: formData.get("maxTeams"),
    rosterSize: formData.get("rosterSize"),
  });

  if (!validated.success) {
    return actionFieldErrors(validated.error.flatten().fieldErrors);
  }

  const { name, teamName, gameMode, maxTeams, rosterSize } = validated.data;
  const { userId } = await requireUser();

  let leagueId: string | null = null;

  for (let attempt = 0; attempt < MAX_INVITE_CODE_ATTEMPTS; attempt++) {
    const inviteCode = generateInviteCode();

    try {
      leagueId = await prisma.$transaction(async (tx) => {
        const league = await tx.league.create({
          data: {
            name,
            gameMode,
            inviteCode,
            commissionerId: userId,
            maxTeams,
            rosterSize,
          },
          select: { id: true },
        });

        await tx.leagueMembership.create({
          data: {
            leagueId: league.id,
            userId,
            role: LeagueRole.COMMISSIONER,
            teamName,
          },
        });

        await tx.scoringRule.createMany({
          data: DEFAULT_SCORING_RULES.map((rule) => ({
            leagueId: league.id,
            statKey: rule.statKey,
            pointsPerUnit: rule.pointsPerUnit,
          })),
        });

        return league.id;
      });
      break;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        attempt < MAX_INVITE_CODE_ATTEMPTS - 1
      ) {
        // Invite code collision — extremely rare, retry with a fresh code.
        continue;
      }
      throw error;
    }
  }

  if (!leagueId) {
    return actionFormError(
      "We couldn't create your league right now. Please try again."
    );
  }

  redirect(`/leagues/${leagueId}`);
}

export async function joinLeague(
  _prevState: ActionResult<null> | undefined,
  formData: FormData
): Promise<ActionResult<null>> {
  const validated = JoinLeagueSchema.safeParse({
    inviteCode: formData.get("inviteCode"),
    teamName: formData.get("teamName"),
  });

  if (!validated.success) {
    return actionFieldErrors(validated.error.flatten().fieldErrors);
  }

  const { inviteCode, teamName } = validated.data;
  const { userId } = await requireUser();

  const league = await prisma.league.findUnique({
    where: { inviteCode: inviteCode.toUpperCase() },
    include: { memberships: { select: { id: true, userId: true } } },
  });

  if (!league) {
    return actionFormError(
      "We couldn't find a league with that invite code."
    );
  }

  if (league.memberships.some((m) => m.userId === userId)) {
    return actionFormError("You're already a member of this league.");
  }

  if (league.memberships.length >= league.maxTeams) {
    return actionFormError("This league is already full.");
  }

  try {
    await prisma.leagueMembership.create({
      data: {
        leagueId: league.id,
        userId,
        role: LeagueRole.MEMBER,
        teamName,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return actionFormError("You're already a member of this league.");
    }
    throw error;
  }

  redirect(`/leagues/${league.id}`);
}

export async function updateScoringRules(
  leagueId: string,
  _prevState: ActionResult<null> | undefined,
  formData: FormData
): Promise<ActionResult<null>> {
  await requireCommissioner(leagueId);

  const statKeys = formData.getAll("statKey");
  const pointsPerUnit = formData.getAll("pointsPerUnit");

  const rules = statKeys.map((statKey, index) => ({
    statKey,
    pointsPerUnit: pointsPerUnit[index],
  }));

  const validated = ScoringRulesArraySchema.safeParse(rules);

  if (!validated.success) {
    return actionFormError(
      "Please make sure every stat has a valid point value."
    );
  }

  await prisma.$transaction(
    validated.data.map((rule) =>
      prisma.scoringRule.upsert({
        where: { leagueId_statKey: { leagueId, statKey: rule.statKey } },
        create: {
          leagueId,
          statKey: rule.statKey,
          pointsPerUnit: rule.pointsPerUnit,
        },
        update: { pointsPerUnit: rule.pointsPerUnit },
      })
    )
  );

  return { success: true, data: null };
}
