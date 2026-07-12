"use client";

import { useActionState, useState } from "react";
import { createLeague } from "@/lib/actions/leagues";
import { CreateLeagueSchema } from "@/lib/validation/league.schema";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { actionFieldErrors, type ActionResult } from "@/lib/validation/action-result";

const GAME_MODES = [
  {
    value: "PRO_PLAYER" as const,
    title: "Pro players",
    description: "Draft real LCS/LEC/LCK pros and score them on their actual games.",
  },
  {
    value: "CHAMPION" as const,
    title: "Champions",
    description: "Draft champions and score them based on how they perform across all pro games.",
  },
];

async function createLeagueWithClientValidation(
  prevState: ActionResult<null> | undefined,
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
  return createLeague(prevState, formData);
}

export function CreateLeagueForm() {
  const [state, action, pending] = useActionState(
    createLeagueWithClientValidation,
    undefined
  );
  const [gameMode, setGameMode] = useState<"PRO_PLAYER" | "CHAMPION">("PRO_PLAYER");

  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-6">
      <div>
        <Label htmlFor="name">League name</Label>
        <Input id="name" name="name" required maxLength={60} />
        <FieldError messages={fieldErrors?.name} />
      </div>

      <div>
        <Label htmlFor="teamName">Your team name</Label>
        <Input id="teamName" name="teamName" required maxLength={30} />
        <FieldError messages={fieldErrors?.teamName} />
      </div>

      <div>
        <Label>Game mode</Label>
        <input type="hidden" name="gameMode" value={gameMode} />
        <div className="grid gap-3 sm:grid-cols-2">
          {GAME_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setGameMode(mode.value)}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                gameMode === mode.value
                  ? "border-accent bg-accent/10"
                  : "border-border bg-surface hover:bg-border/20"
              )}
            >
              <p className="font-medium">{mode.title}</p>
              <p className="mt-1 text-sm text-muted text-pretty">{mode.description}</p>
            </button>
          ))}
        </div>
        <FieldError messages={fieldErrors?.gameMode} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="maxTeams">Max teams</Label>
          <Input id="maxTeams" name="maxTeams" type="number" min={2} max={20} defaultValue={10} />
          <FieldError messages={fieldErrors?.maxTeams} />
        </div>
        <div>
          <Label htmlFor="rosterSize">Roster size</Label>
          <Input id="rosterSize" name="rosterSize" type="number" min={1} max={15} defaultValue={8} />
          <FieldError messages={fieldErrors?.rosterSize} />
        </div>
      </div>

      {state && !state.success && state.formError && (
        <p className="text-sm text-danger" role="alert">
          {state.formError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create league"}
      </Button>
    </form>
  );
}
