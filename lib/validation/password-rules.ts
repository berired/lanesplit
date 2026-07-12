export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

/**
 * Single source of truth for password requirements — used both by the Zod schema
 * (server-side, authoritative) and the live checklist UI (client-side feedback),
 * so the two can never drift apart.
 */
export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "letter", label: "At least one letter", test: (p) => /[a-zA-Z]/.test(p) },
  { id: "number", label: "At least one number", test: (p) => /[0-9]/.test(p) },
];
