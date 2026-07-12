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
  });

  if (!validated.success) {
    return actionFieldErrors(validated.error.flatten().fieldErrors);
  }

  const { displayName, email, password } = validated.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return actionFieldErrors({ email: ["An account with this email already exists."] });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { displayName, email, passwordHash },
    select: { id: true },
  });

  await createSession(user.id);
  redirect("/dashboard");
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
