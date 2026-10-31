# MCP Exchange — how it works

The Exchange is the catalogue of the MCPs produced by the MCP creator: a place
to **publish** a generated MCP, **find** one, and get everything an agent needs
to **connect** to it. One MCP generated once becomes usable by every agent.

It lives in the NestJS backend as its own module,
[`code/backend/src/mcp-exchange/`](../code/backend/src/mcp-exchange/), next to
the creator. The functional decisions behind it are in
[mcp-exchange-spec.md](mcp-exchange-spec.md).

## Big picture

```
            MCP creator                        MCP Exchange
┌──────────────────────────────┐   ┌─────────────────────────────────┐
│ scan website (Playwright)    │   │  POST /exchange/mcps            │
│ → synthesize tools           │──▶│  publish = snapshot + version   │
│ → MCPServerConfig            │   │                                 │
│   (live, can be enriched)    │   │  GET /exchange/mcps?q=…  search │
└──────────────┬───────────────┘   │  GET /exchange/mcps/{id} detail │
               │                   │  GET …/versions/{n}/connection  │
               │                   └───────────────┬─────────────────┘
               │ SSE transport                     │ hands out the address
               ▼                                   ▼
┌──────────────────────────────┐        ┌────────────────────┐
│ /api/v1/servers/{id}/mcp/sse │◀───────│  AI agent (Claude)  │
│ list tools / call tools      │        └────────────────────┘
└──────────────────────────────┘
```

The Exchange never proxies agent traffic: it stores published metadata and
hands out the address of the live MCP transport. Tool calls go straight from
the agent to the transport exposed by the creator.

## Concepts

- **Entry** — one per source website. Its id is derived from the source URL
  (e.g. `ex_localhost-3000-mock-hotel_89bc5b29`), so republishing the same
  site always lands on the same entry.
- **Version** — every publication appends a version (v1, v2, …) to its entry.
  Versions are **append-only**: nothing is ever overwritten or deleted, so a
  published MCP can never break retroactively.
- **Snapshot** — a version embeds a deep copy of the server config (tools,
  selectors, source URL). Enriching the live server later (WordPress, GitHub)
  does not change what was published.
- **Storage** — entries are JSON files in `code/backend/exchange_store/`,
  loaded back into memory on startup. Same pattern as `generated_servers/`.

## API

All routes are under `/api/v1/exchange` and visible in Swagger (`/docs`).

| Route | What it does |
| --- | --- |
| `POST /mcps` | Publish a generated server: `{ "server_id": "…" \| "latest", "description?": "…" }`. Creates the entry or appends a version. Requires a business owner login (Bearer token). |
| `GET /mcps` | List published MCPs as catalogue summaries, newest first. |
| `GET /mcps?q=…` | Search by site (title, URL) or capability (tool names and descriptions of the latest version). |
| `GET /mcps/{entryId}` | Detail: every version with its full tool list. |
| `GET /mcps/{entryId}/versions/{n}` | One version with its tools and call endpoint. |
| `GET /mcps/{entryId}/versions/{n}/connection` | Connection kit for an agent (see below). |

The connection kit contains:

- `transports.sse_url` — the MCP SSE endpoint of the underlying server
  (`/api/v1/servers/{server_id}/mcp/sse`);
- `transports.stdio` — the stdio bridge for clients that do not speak SSE:
  `node code/backend/bin/mcp-runner.mjs <server_id>` with `MCP_BACKEND_URL`;
- `claude_config` — a ready-to-paste `mcpServers` block for Claude;
- `available` — whether the backing server is still registered.

URLs are built from `PUBLIC_BASE_URL` when set (production behind Caddy),
otherwise from the request host.

## End-to-end walkthrough (local)

Start the backend (`npm run start:dev` in `code/backend`), then:

```bash
curl -X POST localhost:3000/api/v1/generate \
  -H 'content-type: application/json' \
  -d '{"url":"http://localhost:3000/mock-hotel"}'
```

```bash
TOKEN=$(curl -s -X POST localhost:3000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"owner@hotelbasel.ch","password":"basel2026"}' | jq -r .token)
```

```bash
curl -X POST localhost:3000/api/v1/exchange/mcps \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"server_id":"latest","description":"Grand Hotel Basel booking"}'
```

```bash
curl 'localhost:3000/api/v1/exchange/mcps?q=reserve'
```

```bash
curl localhost:3000/api/v1/exchange/mcps/<entry_id>/versions/1/connection
```

Paste the returned `claude_config` into your Claude MCP configuration: the
agent connects over SSE, lists `check_availability` and `reserve_room`, and
can act on the hotel site — with the safety layer still in charge (human
confirmation is required by the executor before any irreversible action, and
every tool call is written to the audit trail).

## Guardrails

- Only sites we are authorised to automate are published (our own demo site);
  the scanner's domain allowlist applies to every tool call.
- Published metadata contains fictitious data only.
- Publishing requires a business owner login (the fictitious accounts seeded
  by the auth module); the publisher is recorded in the version metadata.
  Reading, searching and connecting stay public.

## Tests

- `code/backend/test/mcp-exchange.e2e-spec.ts` — publish, versioning,
  persistence, listing, search, detail.
- `code/backend/test/mcp-exchange-connect.e2e-spec.ts` — connection details,
  and a real `@modelcontextprotocol/sdk` client that connects through the
  published SSE URL and lists the tools.
