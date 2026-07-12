import * as z from "zod";

export const CreateLeagueSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "League name must be at least 2 characters long.")
    .max(60, "League name must be 60 characters or fewer."),
  teamName: z
    .string()
    .trim()
    .min(2, "Team name must be at least 2 characters long.")
    .max(30, "Team name must be 30 characters or fewer."),
  gameMode: z.enum(["PRO_PLAYER", "CHAMPION"], {
    error: "Choose a game mode.",
  }),
  maxTeams: z.coerce
    .number()
    .int("Max teams must be a whole number.")
    .min(2, "A league needs at least 2 teams.")
    .max(20, "A league can have at most 20 teams.")
    .default(10),
  startingBudget: z.coerce
    .number()
    .int("Starting budget must be a whole number.")
    .min(1_000_000, "Starting budget must be at least $1,000,000.")
    .max(1_000_000_000, "Starting budget can be at most $1,000,000,000.")
    .default(10_000_000),
});

export const JoinLeagueSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .min(1, "Invite code is required.")
    .max(12, "That doesn't look like a valid invite code.")
    .toUpperCase(),
  teamName: z
    .string()
    .trim()
    .min(2, "Team name must be at least 2 characters long.")
    .max(30, "Team name must be 30 characters or fewer."),
});

export const StatKeySchema = z.enum([
  "kills",
  "deaths",
  "assists",
  "cs",
  "win",
  "visionScore",
]);

export const ScoringRuleSchema = z.object({
  statKey: StatKeySchema,
  pointsPerUnit: z.coerce.number({ error: "Points per unit must be a number." }),
});

export const ScoringRulesArraySchema = z.array(ScoringRuleSchema).length(6);

export type CreateLeagueInput = z.infer<typeof CreateLeagueSchema>;
export type JoinLeagueInput = z.infer<typeof JoinLeagueSchema>;
export type ScoringRuleInput = z.infer<typeof ScoringRuleSchema>;
export type ScoringRulesArrayInput = z.infer<typeof ScoringRulesArraySchema>;
