import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { BrowserContext } from 'playwright';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://hotel.bh2026.tekitup.net',
  'http://localhost:3000',
];

function allowedOrigins(): string[] {
  const configured = process.env.ALLOWED_SITE_ORIGINS;
  return configured
    ? configured.split(',').map((origin) => origin.trim())
    : DEFAULT_ALLOWED_ORIGINS;
}

function isAllowedUrl(url: URL): boolean {
  const origins = allowedOrigins();
  if (origins.includes('*')) return true;
  // file: URLs have no origin, so they are matched by protocol.
  const origin = url.protocol === 'file:' ? 'file:' : url.origin;
  return origins.includes(origin);
}

/**
 * Rejects any site we are not authorised to automate (AGENTS.md section 4).
 * Set ALLOWED_SITE_ORIGINS to a comma-separated list to override the defaults,
 * or to '*' to disable the check while debugging locally.
 */
export function assertAllowedSite(rawUrl: string): void {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException(`Invalid website URL: '${rawUrl}'.`);
  }
  if (!isAllowedUrl(url)) {
    throw new ForbiddenException(
      `${rawUrl} is not an authorised site. Allowed: ${allowedOrigins().join(', ')}.`,
    );
  }
}

/** Stops the browser from following a redirect or link to another site. */
export async function blockDisallowedNavigation(
  context: BrowserContext,
): Promise<void> {
  await context.route('**/*', async (route, request) => {
    if (
      request.isNavigationRequest() &&
      !isAllowedUrl(new URL(request.url()))
    ) {
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
}
