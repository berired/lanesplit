"use client";

import { useActionState } from "react";
import { signup } from "@/lib/actions/auth";
import { SignupSchema } from "@/lib/validation/auth.schema";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { actionFieldErrors, type ActionResult } from "@/lib/validation/action-result";

async function signupWithClientValidation(
  prevState: ActionResult<null> | undefined,
  formData: FormData
): Promise<ActionResult<null>> {
  const validated = SignupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!validated.success) {
    return actionFieldErrors(validated.error.flatten().fieldErrors);
  }
  return signup(prevState, formData);
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signupWithClientValidation, undefined);
  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" name="displayName" autoComplete="name" required />
        <FieldError messages={fieldErrors?.displayName} />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError messages={fieldErrors?.email} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <FieldError messages={fieldErrors?.password} />
        <p className="mt-1.5 text-xs text-muted">
          At least 8 characters, with a letter and a number.
        </p>
      </div>
      {state && !state.success && state.formError && (
        <p className="text-sm text-danger" role="alert">
          {state.formError}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
