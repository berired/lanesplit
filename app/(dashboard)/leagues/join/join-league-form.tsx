"use client";

import { useActionState } from "react";
import { joinLeague } from "@/lib/actions/leagues";
import { JoinLeagueSchema } from "@/lib/validation/league.schema";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { actionFieldErrors, type ActionResult } from "@/lib/validation/action-result";

async function joinLeagueWithClientValidation(
  prevState: ActionResult<null> | undefined,
  formData: FormData
): Promise<ActionResult<null>> {
  const validated = JoinLeagueSchema.safeParse({
    inviteCode: formData.get("inviteCode"),
    teamName: formData.get("teamName"),
  });
  if (!validated.success) {
    return actionFieldErrors(validated.error.flatten().fieldErrors);
  }
  return joinLeague(prevState, formData);
}

export function JoinLeagueForm() {
  const [state, action, pending] = useActionState(
    joinLeagueWithClientValidation,
    undefined
  );

  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="inviteCode">Invite code</Label>
        <Input
          id="inviteCode"
          name="inviteCode"
          required
          maxLength={12}
          autoCapitalize="characters"
          onChange={(e) => {
            e.currentTarget.value = e.currentTarget.value.toUpperCase();
          }}
        />
        <FieldError messages={fieldErrors?.inviteCode} />
      </div>

      <div>
        <Label htmlFor="teamName">Your team name</Label>
        <Input id="teamName" name="teamName" required maxLength={30} />
        <FieldError messages={fieldErrors?.teamName} />
      </div>

      {state && !state.success && state.formError && (
        <p className="text-sm text-danger" role="alert">
          {state.formError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Joining…" : "Join league"}
      </Button>
    </form>
  );
}
