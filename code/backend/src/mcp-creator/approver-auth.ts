import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// The approval link reaches the agent too, so holding it proves nothing. Only
// a browser logged in with APPROVER_PASSWORD, which the agent never sees, can
// approve. Without that variable, nobody can approve (fail closed).
export const APPROVER_COOKIE = 'approver_session';
export const APPROVER_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

// ponytail: in-memory sessions, a restart logs the approver out.
const sessions = new Map<string, number>();
let failedLogins: number[] = [];

const digest = (value: string) => createHash('sha256').update(value).digest();

/** Returns a new session id, or undefined if the password is wrong, unset or locked out. */
export function loginApprover(password: unknown): string | undefined {
  const expected = process.env.APPROVER_PASSWORD;
  const now = Date.now();
  failedLogins = failedLogins.filter((t) => now - t < LOCKOUT_MS);
  if (!expected || failedLogins.length >= MAX_FAILED_LOGINS) return undefined;
  if (
    typeof password !== 'string' ||
    !timingSafeEqual(digest(password), digest(expected))
  ) {
    failedLogins.push(now);
    return undefined;
  }
  const id = randomBytes(32).toString('base64url');
  sessions.set(id, now + APPROVER_SESSION_TTL_MS);
  return id;
}

export function isApprover(cookieHeader: string | undefined): boolean {
  const id = cookieHeader?.match(
    new RegExp(`(?:^|;\\s*)${APPROVER_COOKIE}=([\\w-]+)`),
  )?.[1];
  const expiresAt = id ? sessions.get(id) : undefined;
  return expiresAt !== undefined && expiresAt > Date.now();
}
