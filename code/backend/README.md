<p align="center">
  <img src="../../assets/logo.png" alt="MCPEX logo" width="96">
</p>

<h1 align="center">MCPEX backend</h1>

<p align="center">
  <strong>The NestJS API that generates, runs and exposes MCP servers.</strong>
</p>

<p align="center">
  <a href="../../readme.md">MCPEX</a> ·
  <a href="../../documentation/local-setup.md">Setup guide</a> ·
  <a href="../../documentation/TUTORIAL_CONNECT_AGENTS.md">Connect an agent</a> ·
  <a href="../frontend/README.md">Frontend</a> ·
  <a href="../infra/README.md">Infrastructure</a>
</p>

---

## Overview

The backend scans websites, synthesizes MCP tools, runs them with Playwright and serves them to agents. It also hosts the [MCP Exchange](../../documentation/mcp-exchange.md).

## Quick start

From `code/backend`:

```bash
npm ci
npx playwright install chromium
npm run start:dev
```

The API runs on http://localhost:3000, with interactive docs at `/docs`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run start` | Start the backend. |
| `npm run start:dev` | Start in watch mode. |
| `npm run start:prod` | Run the production build. |
| `npm run test` | Run the unit tests. |
| `npm run test:e2e` | Run the end-to-end tests. |
| `npm run test:cov` | Run the tests with coverage. |

## Endpoints

| Route | Purpose |
| --- | --- |
| `POST /api/v1/generate` | Scan a URL, synthesize MCP tools and register the server (`{ "url": "..." }`). |
| `POST /api/v1/scan` | Scan a URL and return its forms, inputs and buttons. |
| `GET /api/v1/servers` | List generated servers and their enabled state. |
| `GET /api/v1/servers/:id` | Get a server's tool schemas. |
| `PATCH /api/v1/servers/:id` | Enable or disable a server (`{ "enabled": false }`). |
| `PATCH /api/v1/servers/:id/tools/:toolName` | Enable or disable a tool (`{ "enabled": false }`). |
| `POST /api/v1/servers/:id/call` | Run a tool such as `check_availability` or `reserve_room` on the live site. |
| `GET /api/v1/servers/:id/mcp/sse` | Open the MCP connection for agents. |
| `POST /api/v1/servers/:id/mcp/messages` | Send MCP messages from agents. |
| `GET /api/v1/servers/:id/connect/github` | Start GitHub OAuth. |
| `GET /api/v1/servers/:id/connect/wordpress?site_url=...` | Start WordPress OAuth. |
| `POST /api/v1/oauth/:provider/consume` | Exchange a short-lived, one-use ticket for an access token (`{ "ticket": "...", "serverId": "..." }`). |
| `GET /mock-hotel` | Serve a local hotel page for testing. |

Disabled servers and tools cannot be called through the API. The Exchange API is described in [mcp-exchange.md](../../documentation/mcp-exchange.md).

## OAuth configuration

Register OAuth applications with these exact callback URLs:

- `https://api.bh2026.tekitup.net/api/v1/oauth/github/callback`
- `https://api.bh2026.tekitup.net/api/v1/oauth/wordpress/callback`

Configure `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_OAUTH_REDIRECT_URL`, `WORDPRESS_CLIENT_ID`, `WORDPRESS_CLIENT_SECRET`, `WORDPRESS_OAUTH_REDIRECT_URL`, and `MCPEX_FRONTEND_URL` in the backend environment. Never commit provider secrets. Locally, point `MCPEX_FRONTEND_URL` at the Vite frontend.

OAuth access tokens are exchanged server-side, held in memory for a one-use ticket for 60 seconds, and returned to the frontend only after that ticket is consumed. The frontend keeps tokens in memory and sends them with the enrichment request; reconnect after a page reload or backend restart. The current prototype does not yet have MCPEX user accounts or per-user server ownership.

## Configuration

Environment variables are listed in the [setup guide](../../documentation/local-setup.md#environment-variables).

## Deployment

The backend is deployed with NixOS and comin. See the [infrastructure README](../infra/README.md).
