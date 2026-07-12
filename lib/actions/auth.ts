"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { createSession, deleteSession } from "@/lib/auth/session";
import { LoginSchema, SignupSchema } from "@/lib/validation/auth.schema";
import { actionFieldErrors, actionFormError, type ActionResult } from "@/lib/validation/action-result";

const GENERIC_LOGIN_ERROR = "Incorrect email or password.";

export async function signup(
  _prevState: ActionResult<null> | undefined,
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

  const { displayName, email, password } = validated.data;

  const [existingEmail, existingName] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { displayName } }),
  ]);
  if (existingEmail) {
    return actionFieldErrors({ email: ["An account with this email already exists."] });
  }
  if (existingName) {
    return actionFieldErrors({ displayName: ["That display name is already taken."] });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user: { id: string };
  try {
    user = await prisma.user.create({
      data: { displayName, email, passwordHash },
      select: { id: true },
    });
  } catch (error) {
    // Backstop for a race between the pre-checks above and the insert (e.g. two
    // people signing up with the same name/email at the same instant).
    if (isUniqueConstraintError(error, "email")) {
      return actionFieldErrors({ email: ["An account with this email already exists."] });
    }
    if (isUniqueConstraintError(error, "displayName")) {
      return actionFieldErrors({ displayName: ["That display name is already taken."] });
    }
    throw error;
  }

  await createSession(user.id);
  redirect("/dashboard");
}

/**
 * Live availability checks called directly from the signup form as the user
 * types (debounced client-side). Kept separate from `signup` itself, which is
 * the actual source of truth — these are just fast, cheap UX hints.
 */
export async function checkEmailAvailability(email: string): Promise<{ available: boolean }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { available: true };
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  return { available: !existing };
}

export async function checkDisplayNameAvailability(
  displayName: string
): Promise<{ available: boolean }> {
  const normalized = displayName.trim();
  if (!normalized) return { available: true };
  const existing = await prisma.user.findUnique({ where: { displayName: normalized } });
  return { available: !existing };
}

function isUniqueConstraintError(error: unknown, field: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002" &&
    "meta" in error &&
    Array.isArray((error as { meta?: { target?: unknown } }).meta?.target) &&
    ((error as { meta: { target: unknown[] } }).meta.target as unknown[]).includes(field)
  );
}

export async function login(
  _prevState: ActionResult<null> | undefined,
  formData: FormData
): Promise<ActionResult<null>> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return actionFieldErrors(validated.error.flatten().fieldErrors);
  }

  const { email, password } = validated.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return actionFormError(GENERIC_LOGIN_ERROR);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return actionFormError(GENERIC_LOGIN_ERROR);
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
