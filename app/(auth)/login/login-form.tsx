"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import { LoginSchema } from "@/lib/validation/auth.schema";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { actionFieldErrors, type ActionResult } from "@/lib/validation/action-result";

async function loginWithClientValidation(
  prevState: ActionResult<null> | undefined,
  formData: FormData
): Promise<ActionResult<null>> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!validated.success) {
    return actionFieldErrors(validated.error.flatten().fieldErrors);
  }
  return login(prevState, formData);
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginWithClientValidation, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError messages={state && !state.success ? state.fieldErrors?.email : undefined} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
        />
        <FieldError
          messages={state && !state.success ? state.fieldErrors?.password : undefined}
        />
      </div>
      {state && !state.success && state.formError && (
        <p className="text-sm text-danger" role="alert">
          {state.formError}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
