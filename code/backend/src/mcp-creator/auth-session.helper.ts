import type { AuthSessionData, CookieItem } from './mcp-creator.types.js';

export interface NormalizedSession {
  cookies: CookieItem[];
  storageState?: { cookies: any[]; origins: any[] };
  extraHeaders?: Record<string, string>;
}

/**
 * Normalizes user-supplied session data (Playwright storageState, cookies, or headers)
 * into a standard format usable by Playwright browser contexts and HTTP fetch calls.
 */
export function normalizeAuthSession(
  authSession?: AuthSessionData | string,
  targetUrl?: string,
): NormalizedSession {
  if (!authSession) {
    return { cookies: [] };
  }

  let sessionObj: AuthSessionData = {};
  if (typeof authSession === 'string') {
    try {
      sessionObj = JSON.parse(authSession);
    } catch {
      if (
        authSession.startsWith('Bearer ') ||
        authSession.startsWith('bearer ')
      ) {
        return { cookies: [], extraHeaders: { Authorization: authSession } };
      }
      return { cookies: [] };
    }
  } else {
    sessionObj = authSession;
  }

  let defaultDomain: string | undefined;
  if (targetUrl) {
    try {
      defaultDomain = new URL(targetUrl).hostname;
    } catch {}
  }

  const cookies: CookieItem[] = (sessionObj.cookies || []).map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain || defaultDomain || 'localhost',
    path: c.path || '/',
    expires: c.expires ?? -1,
    httpOnly: c.httpOnly ?? false,
    secure: c.secure ?? false,
    sameSite: c.sameSite ?? 'Lax',
  }));

  const storageState =
    cookies.length > 0 || (sessionObj.origins && sessionObj.origins.length > 0)
      ? {
          cookies,
          origins: sessionObj.origins || [],
        }
      : undefined;

  return {
    cookies,
    storageState,
    extraHeaders: sessionObj.extraHeaders,
  };
}
