"use client";

import { useState } from "react";
import { useActionState } from "react";
import { signup, checkEmailAvailability, checkDisplayNameAvailability } from "@/lib/actions/auth";
import { SignupSchema } from "@/lib/validation/auth.schema";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { AvailabilityHint } from "@/components/ui/availability-hint";
import { useDebouncedAvailability } from "@/lib/hooks/use-debounced-availability";
import { actionFieldErrors, type ActionResult } from "@/lib/validation/action-result";

async function signupWithClientValidation(
  prevState: ActionResult<null> | undefined,
  formData: FormData
): Promise<ActionResult<null>> {
  const validated = SignupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!validated.success) {
    return actionFieldErrors(validated.error.flatten().fieldErrors);
  }
  return signup(prevState, formData);
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signupWithClientValidation, undefined);
  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const displayNameStatus = useDebouncedAvailability(displayName, checkDisplayNameAvailability, {
    minLength: 2,
  });
  const emailStatus = useDebouncedAvailability(email, checkEmailAvailability, { minLength: 5 });

  const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== password;

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <FieldError messages={fieldErrors?.displayName} />
        <AvailabilityHint
          status={displayNameStatus}
          takenLabel="That display name is already taken."
          availableLabel="Available"
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FieldError messages={fieldErrors?.email} />
        <AvailabilityHint
          status={emailStatus}
          takenLabel="An account with this email already exists."
          availableLabel="Available"
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FieldError messages={fieldErrors?.password} />
        <PasswordStrength password={password} />
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <FieldError messages={fieldErrors?.confirmPassword} />
        {confirmMismatch && !fieldErrors?.confirmPassword && (
          <p className="mt-1.5 text-sm text-danger" role="alert">
            Passwords don&apos;t match.
          </p>
        )}
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
