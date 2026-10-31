import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

type Provider = 'github' | 'wordpress';
type PendingConnection = { serverId: string; provider: Provider; wpSiteUrl?: string; expiresAt: number };
type ConnectionTicket = { serverId: string; provider: Provider; accessToken: string; wpSiteId?: string; wpSiteUrl?: string; expiresAt: number };

@Injectable()
export class ProviderConnectionsService {
  private readonly pending = new Map<string, PendingConnection>();
  private readonly tickets = new Map<string, ConnectionTicket>();

  get frontendUrl() {
    return (process.env.MCPEX_FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  }

  private config(provider: Provider) {
    const prefix = provider === 'github' ? 'GITHUB' : 'WORDPRESS';
    const clientId = process.env[`${prefix}_CLIENT_ID`];
    const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
    const redirectUri = process.env[`${prefix}_OAUTH_REDIRECT_URL`];
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException(`${prefix}_CLIENT_ID, ${prefix}_CLIENT_SECRET and ${prefix}_OAUTH_REDIRECT_URL must be configured`);
    }
    return { clientId, clientSecret, redirectUri };
  }

  beginGithub(serverId: string) {
    const { clientId, redirectUri } = this.config('github');
    return this.authorizationUrl(serverId, 'github', 'https://github.com/login/oauth/authorize', {
      client_id: clientId, redirect_uri: redirectUri, scope: 'repo',
    });
  }

  beginWordPress(serverId: string, siteUrl: string) {
    const { clientId, redirectUri } = this.config('wordpress');
    let parsed: URL;
    try { parsed = new URL(siteUrl); } catch { throw new BadRequestException('A valid WordPress site URL is required'); }
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
      throw new BadRequestException('WordPress site URLs must use HTTPS');
    }
    return this.authorizationUrl(serverId, 'wordpress', 'https://public-api.wordpress.com/oauth2/authorize', {
      client_id: clientId, redirect_uri: redirectUri, response_type: 'code', blog: parsed.origin,
    }, parsed.origin);
  }

  private authorizationUrl(serverId: string, provider: Provider, endpoint: string, params: Record<string, string>, wpSiteUrl?: string) {
    const state = randomBytes(32).toString('hex');
    this.pending.set(state, { serverId, provider, wpSiteUrl, expiresAt: Date.now() + 10 * 60 * 1000 });
    const url = new URL(endpoint);
    for (const [key, value] of Object.entries({ ...params, state })) url.searchParams.set(key, value);
    return url.toString();
  }

  async complete(provider: Provider, code: string, state: string) {
    const pending = this.pending.get(state);
    this.pending.delete(state);
    if (!pending || pending.provider !== provider || pending.expiresAt < Date.now()) {
      throw new BadRequestException('OAuth state is invalid or expired');
    }
    const config = this.config(provider);
    const tokenUrl = provider === 'github'
      ? 'https://github.com/login/oauth/access_token'
      : 'https://public-api.wordpress.com/oauth2/token';
    const body: Record<string, string> = provider === 'github'
      ? { client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: config.redirectUri, state }
      : { client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: config.redirectUri, grant_type: 'authorization_code' };
    let response: Response;
    try {
      const isGithub = provider === 'github';
      response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': isGithub ? 'application/json' : 'application/x-www-form-urlencoded' },
        body: isGithub ? JSON.stringify(body) : new URLSearchParams(body).toString(),
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      throw new BadGatewayException(`Unable to reach ${provider} OAuth: ${(error as Error).message}`);
    }
    const payload = await response.json().catch(() => ({})) as Record<string, any>;
    if (!response.ok || !payload.access_token) {
      throw new BadGatewayException(payload.error_description || payload.error || `${provider} OAuth token exchange failed`);
    }
    const ticket = randomBytes(32).toString('hex');
    this.tickets.set(ticket, {
      serverId: pending.serverId,
      provider,
      accessToken: payload.access_token,
      ...(provider === 'wordpress' ? { wpSiteId: String(payload.blog_id || ''), wpSiteUrl: pending.wpSiteUrl || payload.blog_url } : {}),
      expiresAt: Date.now() + 60_000,
    });
    return { serverId: pending.serverId, provider, ticket };
  }

  cancel(provider: Provider, state: string) {
    const pending = this.pending.get(state);
    this.pending.delete(state);
    if (!pending || pending.provider !== provider || pending.expiresAt < Date.now()) {
      throw new BadRequestException('OAuth state is invalid or expired');
    }
    return { serverId: pending.serverId, provider };
  }

  consumeTicket(ticket: string, serverId: string, provider: Provider) {
    const connection = this.tickets.get(ticket);
    this.tickets.delete(ticket);
    if (!connection || connection.serverId !== serverId || connection.provider !== provider || connection.expiresAt < Date.now()) {
      throw new BadRequestException('OAuth ticket is invalid or expired; connect the account again');
    }
    return { accessToken: connection.accessToken, wpSiteId: connection.wpSiteId, siteUrl: connection.wpSiteUrl };
  }

  frontendResult(serverId: string, provider: Provider, success: boolean, ticket?: string) {
    const url = new URL(this.frontendUrl);
    const result = new URLSearchParams({ oauth: success ? 'connected' : 'error', provider, server_id: serverId });
    if (ticket) result.set('ticket', ticket);
    url.hash = result.toString();
    return url.toString();
  }
}
