const DAY_MS = 24 * 60 * 60 * 1000;

export interface GeneratedMatchup {
  homeMembershipId: string;
  awayMembershipId: string;
}

export interface GeneratedWeek {
  weekNumber: number;
  startsAt: Date;
  endsAt: Date;
  matchups: GeneratedMatchup[];
}

/**
 * Generates a round-robin schedule using the standard "circle method": fix one
 * team, rotate the rest around it each round, pairing opposite ends of the circle.
 *
 * Odd team counts are handled by adding a placeholder "BYE" slot to the circle —
 * whichever real team lands opposite the BYE that week simply has no matchup
 * (we omit that pairing rather than inventing a "bye team" DB row).
 *
 * Each week runs 7 days: endsAt = startsAt + 6 days, and the next week's startsAt
 * begins the day after the previous week's endsAt.
 *
 * Pure/unit-testable — no Prisma calls here. Intended to be invoked by the draft
 * engineer's code once `Draft.status` transitions to COMPLETED, to persist the
 * result as SeasonWeek + Matchup rows.
 */
export function generateRoundRobinSchedule(
  membershipIds: string[],
  startDate: Date
): GeneratedWeek[] {
  const BYE = null;
  const teams: (string | null)[] = [...membershipIds];

  if (teams.length < 2) return [];

  if (teams.length % 2 !== 0) {
    teams.push(BYE);
  }

  const teamCount = teams.length;
  const roundsPerLeg = teamCount - 1;
  const half = teamCount / 2;

  // Working copy that gets rotated each round. Index 0 stays fixed;
  // the rest rotate clockwise around it.
  const rotation = [...teams];

  const weeks: GeneratedWeek[] = [];
  let weekStart = new Date(startDate);

  for (let round = 0; round < roundsPerLeg; round++) {
    const matchups: GeneratedMatchup[] = [];

    for (let i = 0; i < half; i++) {
      const teamA = rotation[i];
      const teamB = rotation[teamCount - 1 - i];

      if (teamA !== BYE && teamB !== BYE) {
        // Alternate home/away by round to balance home games across the season.
        if (round % 2 === 0) {
          matchups.push({ homeMembershipId: teamA, awayMembershipId: teamB });
        } else {
          matchups.push({ homeMembershipId: teamB, awayMembershipId: teamA });
        }
      }
    }

    const endsAt = new Date(weekStart.getTime() + 6 * DAY_MS);
    weeks.push({
      weekNumber: round + 1,
      startsAt: new Date(weekStart),
      endsAt,
      matchups,
    });

    weekStart = new Date(endsAt.getTime() + DAY_MS);

    // Rotate: keep index 0 fixed, shift everyone else one position clockwise.
    const fixed = rotation[0];
    const rest = rotation.slice(1);
    rest.unshift(rest.pop() as string | null);
    rotation.splice(0, rotation.length, fixed, ...rest);
  }

  return weeks;
}
