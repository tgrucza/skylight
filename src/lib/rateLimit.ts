/**
 * In-memory sliding-window limiter. Best-effort only — a serverless instance
 * can cold-start and lose this state, and it isn't shared across instances.
 * Combined with bcrypt's inherent per-attempt cost, this is still a
 * meaningful brute-force deterrent for a 4-digit wall PIN (spec §7.5)
 * without provisioning Redis for an MVP whose schema (§3) is otherwise final.
 */
const attempts = new Map<string, number[]>();

export function isRateLimited(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  attempts.set(key, recent);
  return recent.length >= maxAttempts;
}

export function recordAttempt(key: string): void {
  const list = attempts.get(key) ?? [];
  list.push(Date.now());
  attempts.set(key, list);
}
