"use client";

import { useActionState } from "react";
import { updateScoringRules } from "@/lib/actions/leagues";
import { ScoringRulesArraySchema } from "@/lib/validation/league.schema";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { actionFormError, type ActionResult } from "@/lib/validation/action-result";

const STAT_FIELDS: { key: string; label: string; step: string }[] = [
  { key: "kills", label: "Kills", step: "0.1" },
  { key: "deaths", label: "Deaths", step: "0.1" },
  { key: "assists", label: "Assists", step: "0.1" },
  { key: "cs", label: "CS", step: "0.01" },
  { key: "win", label: "Win", step: "0.1" },
  { key: "visionScore", label: "Vision score", step: "0.01" },
];

export function ScoringRulesForm({
  leagueId,
  initialValues,
}: {
  leagueId: string;
  initialValues: Record<string, number>;
}) {
  const updateScoringRulesForLeague = updateScoringRules.bind(null, leagueId);

  async function updateWithClientValidation(
    prevState: ActionResult<null> | undefined,
    formData: FormData
  ): Promise<ActionResult<null>> {
    const statKeys = formData.getAll("statKey");
    const pointsPerUnit = formData.getAll("pointsPerUnit");
    const rules = statKeys.map((statKey, index) => ({
      statKey,
      pointsPerUnit: pointsPerUnit[index],
    }));
    const validated = ScoringRulesArraySchema.safeParse(rules);
    if (!validated.success) {
      return actionFormError("Please make sure every stat has a valid point value.");
    }
    return updateScoringRulesForLeague(prevState, formData);
  }

  const [state, action, pending] = useActionState(
    updateWithClientValidation,
    undefined
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {STAT_FIELDS.map((field) => (
          <div key={field.key}>
            <Label htmlFor={field.key}>{field.label} (pts per unit)</Label>
            <input type="hidden" name="statKey" value={field.key} />
            <Input
              id={field.key}
              name="pointsPerUnit"
              type="number"
              step={field.step}
              defaultValue={initialValues[field.key] ?? 0}
            />
          </div>
        ))}
      </div>

      {state && !state.success && state.formError && (
        <p className="text-sm text-danger" role="alert">
          {state.formError}
        </p>
      )}
      {state && state.success && (
        <p className="text-sm text-success" role="status">
          Scoring rules saved.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save scoring rules"}
      </Button>
    </form>
  );
}
