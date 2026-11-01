# MCPEX backend

NestJS backend application with integrated **Model Context Protocol (MCP) Creator** for scanning hotel booking websites and executing reservation tools dynamically.

### MCP Creator Endpoints

- `POST /api/v1/generate`: Scans a hotel URL, synthesizes MCP tools, and registers the server (`{ "url": "..." }`).
- `POST /api/v1/scan`: Scans a URL and returns extracted forms, inputs, and buttons.
- `GET /api/v1/servers`: Lists all generated MCP servers and their enabled state.
- `GET /api/v1/servers/:id`: Retrieves tool schemas for a specific MCP server.
- `PATCH /api/v1/servers/:id` (`{ "enabled": false }`): Enables or disables an MCP server.
- `PATCH /api/v1/servers/:id/tools/:toolName` (`{ "enabled": false }`): Enables or disables a tool. Disabled servers and tools cannot be called through the API.
- `GET /api/v1/servers/:id/connect/github` and `/connect/wordpress?site_url=...`: Start provider OAuth.
- `POST /api/v1/oauth/:provider/consume` (`{ "ticket": "...", "serverId": "..." }`): Exchanges a short-lived, one-use OAuth ticket for an access token.
- `POST /api/v1/servers/:id/call`: Executes an MCP tool (`check_availability` or `reserve_room`) via Playwright on the live site.
- `GET /api/v1/servers/:id/mcp/sse` and `POST /api/v1/servers/:id/mcp/messages`: MCP transport for agents (see [Connecting agents](../../documentation/TUTORIAL_CONNECT_AGENTS.md)).
- `GET /mock-hotel`: Local Swiss hotel booking page for self-contained testing.

Interactive API docs are served at `/docs`. The MCP Exchange API is described in [mcp-exchange.md](../../documentation/mcp-exchange.md).

## OAuth configuration

Register OAuth applications with these exact callback URLs:

- `https://api.bh2026.tekitup.net/api/v1/oauth/github/callback`
- `https://api.bh2026.tekitup.net/api/v1/oauth/wordpress/callback`

Configure `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_OAUTH_REDIRECT_URL`, `WORDPRESS_CLIENT_ID`, `WORDPRESS_CLIENT_SECRET`, `WORDPRESS_OAUTH_REDIRECT_URL`, and `MCPEX_FRONTEND_URL` in the backend environment. Never commit provider secrets. Locally, point `MCPEX_FRONTEND_URL` at the Vite frontend.

OAuth access tokens are exchanged server-side, held in memory for a one-use ticket for 60 seconds, and returned to the frontend only after that ticket is consumed. The frontend keeps tokens in memory and sends them with the enrichment request; reconnect after a page reload or backend restart. The current prototype does not yet have MCPEX user accounts or per-user server ownership.

## Project setup

```bash
npm ci
npx playwright install chromium
```

## Compile and run the project

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## Run tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## Configuration

Environment variables are listed in the [local setup guide](../../documentation/local-setup.md#environment-variables).

## Deployment

The backend is deployed with NixOS and comin. See the [infrastructure README](../infra/README.md).
