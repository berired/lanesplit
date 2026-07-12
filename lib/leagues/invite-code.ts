// Uppercase alphanumeric charset with visually/verbally ambiguous characters
// removed (0/O, 1/I/L) so codes are easy for friends to read aloud and type.
const CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 7;

/** Generates a short, unambiguous, uppercase invite code (e.g. "8FQKX3P"). */
export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = Math.floor(Math.random() * CHARSET.length);
    code += CHARSET[index];
  }
  return code;
}
