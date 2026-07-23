/** Normalize emails for invite matching — always lowercase + trim on store and lookup. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
