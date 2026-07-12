/**
 * Pure, side-effect-free snake draft math. No Prisma calls, no dates, no I/O.
 *
 * Centralizing this here means the exact same functions can be imported both by a
 * Server Component (to compute an initial snapshot) and by a client component (for
 * optimistic UI) without the two ever disagreeing about whose turn it is.
 */

/**
 * Returns the pick order for a given round. Odd rounds pick in `baseOrder` order,
 * even rounds pick in reverse ("snake") order.
 */
export function computeSnakeOrder(baseOrder: string[], round: number): string[] {
  const isEvenRound = round % 2 === 0;
  return isEvenRound ? [...baseOrder].reverse() : [...baseOrder];
}

/**
 * Given the league's base draft order, the current round, and the index of the pick
 * within that round (0-based), returns the membershipId that is on the clock.
 */
export function getOnClockMembershipId(
  draftOrder: string[],
  round: number,
  pickIndexInRound: number
): string {
  const order = computeSnakeOrder(draftOrder, round);
  const membershipId = order[pickIndexInRound];
  if (membershipId === undefined) {
    throw new Error(
      `pickIndexInRound ${pickIndexInRound} out of range for draftOrder of length ${draftOrder.length}`
    );
  }
  return membershipId;
}

/**
 * Converts a (round, pickIndexInRound) position into a 1-based overall pick number
 * across the whole draft.
 */
export function getOverallPickNumber(
  draftOrder: string[],
  round: number,
  pickIndexInRound: number
): number {
  return (round - 1) * draftOrder.length + pickIndexInRound + 1;
}

/**
 * Advances the (round, currentPickIndex) position by one pick, rolling over into the
 * next round once `currentPickIndex` reaches the last slot in the round.
 */
export function getNextPosition({
  round,
  currentPickIndex,
  teamCount,
}: {
  round: number;
  currentPickIndex: number;
  teamCount: number;
}): { round: number; currentPickIndex: number } {
  const isLastPickInRound = currentPickIndex >= teamCount - 1;
  if (isLastPickInRound) {
    return { round: round + 1, currentPickIndex: 0 };
  }
  return { round, currentPickIndex: currentPickIndex + 1 };
}

/**
 * A draft is complete once every team has made `rosterSize` picks, i.e. once we'd be
 * starting a round beyond `rosterSize`.
 */
export function isDraftComplete({
  round,
  teamCount,
  rosterSize,
}: {
  round: number;
  teamCount: number;
  rosterSize: number;
}): boolean {
  void teamCount; // kept in the signature for symmetry/readability at call sites
  return round > rosterSize;
}
