# MCP Exchange — functional specification

> Issue [#22](https://github.com/vmbr068/baselhack-2026/issues/22) · Epic [E5 #7](https://github.com/vmbr068/baselhack-2026/issues/7)
> **Status: v2** — section 2 records the scope decisions settled in
> [#13](https://github.com/vmbr068/baselhack-2026/issues/13).

## 1. What the Exchange is, and for whom

The MCP creator turns a website into an MCP server. The **Exchange** is the
catalogue on top of it: a place where generated MCPs are **published, found and
reused**, so that an MCP generated once benefits every agent, not only the
person who ran the generation.

Two kinds of users:

- **Publisher** — a person who generated an MCP with the creator and wants to
  share it. Needs: publish in one action, see their published MCPs and versions.
- **Consumer** — a person (or their AI agent) who wants to act on a site that
  already has a published MCP. Needs: find an MCP by site or capability, inspect
  its tools, and get everything required to connect an agent to it.

The Exchange is **not part of the MVP** (epic #7): the core demo — generate an
MCP for our hotel site and let an agent book through it — must work without it.
The Exchange extends the pitch ("generate once, every agent can reuse it") and
must never block the demo.

## 2. Scope decisions (issue #13 — settled)

1. The Exchange is a **catalogue for publishing and finding generated MCPs** —
   not a marketplace (no payments, ratings or moderation).
2. **Publishing requires a business owner login** — the fictitious accounts
   built in #85 (`POST /api/v1/auth/login`, Bearer token). The publisher is
   recorded in the published version's metadata. Browsing, searching and
   connecting an agent stay public, and so does the demo hotel site.
3. The Exchange lives in the **NestJS backend**
   (`code/backend/src/mcp-exchange/`), next to the MCP creator ported in #63.
   Entries persist as JSON in `exchange_store/` until the database work
   (#20/#87) takes over.

## 3. User flows

### 3.1 Publish an MCP (issue #45)

1. The publisher generates an MCP for a site with the creator (existing
   `POST /api/v1/generate`). Generation alone does **not** publish anything.
2. The publisher triggers **Publish** on a generated server (API call or button
   in the creator UI), optionally with a short description.
3. The Exchange stores a new **published entry** with its metadata: source site
   URL, site title, tool list (names, descriptions, parameter schemas, and
   whether the tool is irreversible), publisher, publication date, version.
4. The entry appears in the public catalogue.

### 3.2 Versioning (issue #45)

- Publishing an MCP for a source site that already has a published entry
  creates a **new version** (v1, v2, …) under the same entry; it never
  overwrites or deletes the previous one.
- The catalogue shows the latest version by default; older versions remain
  listed and connectable from the detail view.

### 3.3 Find an MCP (issue #48)

1. The consumer opens the catalogue and sees the list of published MCPs
   (site name, source URL, number of tools, latest version, publication date).
2. They can **search by source site** (name or URL) and **by capability**
   (tool name or words in tool descriptions, e.g. "book", "search rooms").
3. Opening an entry shows the **detail view**: all versions, and for each
   version the full tool list with descriptions, parameters and the
   irreversible flag.

### 3.4 Connect an agent (issue #53)

1. The detail view exposes **connection details** for a chosen version: the
   MCP endpoint URL and a ready-to-paste client configuration snippet
   (e.g. for Claude).
2. The agent connects, lists the tools, and can call them. Tool calls are
   executed by the existing execution engine against the source site.
3. Depends on #43 (generated MCPs reachable by the agent) for the transport;
   the Exchange only hands out the address, it does not proxy agent traffic.

## 4. MVP scope of the Exchange

**In:**

- Explicit publish action on a generated MCP, with the metadata of 3.1.
- Append-only versioning per source site.
- Public list, search (site + capability) and detail view, as API endpoints
  plus a minimal page (the existing creator dashboard is enough as a base).
- Connection details per version.
- Publishing requires login (see #13/#38); reading does not.

**Out (explicitly excluded):**

- Ratings, comments, download counts, moderation, deprecation workflows.
- Payments or any monetisation.
- Editing or deleting published versions (append-only is a feature: the demo
  cannot be broken by a deletion).
- Organisations, teams, fine-grained permissions — one flat user space.
- Semantic / AI-powered search; plain text matching is enough.
- Health checks or uptime monitoring of published MCPs.

## 5. Data model (aligned with the E4-2 format)

The published metadata reuses the creator's existing models
(`code/mcp_creator/models.py`): a published version embeds the
`MCPServerConfig` (server id, site title, target URL, `MCPToolDefinition`
list). On top of it, the Exchange adds:

- `ExchangeEntry`: one per source site — entry id, source URL, site title,
  list of versions.
- `ExchangeVersion`: version number, published-at timestamp, publisher,
  optional description, the embedded server config, connection endpoint.

Note for E4-2/E8 alignment: `MCPToolDefinition` does not yet carry an
**irreversible** flag (E4-2 acceptance criterion, needed by E8's human
confirmation). The Exchange displays it as soon as the field exists; until
then, `reserve_room`-type tools are treated as irreversible by name.

## 6. API sketch

Prefix `/api/v1/exchange`, in the existing FastAPI service:

- `POST /mcps` — publish a generated server (`server_id`, optional
  description). Auth required. Creates the entry or appends a version.
- `GET /mcps?q=…` — list / search published MCPs (matches site name, URL,
  tool names and descriptions).
- `GET /mcps/{entry_id}` — detail: all versions and their tools.
- `GET /mcps/{entry_id}/versions/{n}` — one version, including connection
  details.

## 7. Safety (epic E8 guardrails)

- The Exchange stores and displays which tools are irreversible, so any agent
  UI can require human confirmation before calling them.
- Only sites we are authorised to automate are published during the hackathon:
  in practice, our own demo site. No third-party site in the catalogue.
- All data is fictitious; published metadata contains no personal data.

## 8. Open questions

1. Does the demo use the Exchange on stage (nice-to-have ending: "and the MCP
   is now published for every agent"), or is it shown separately?

## 9. Issue mapping

| Issue | Covered by |
| --- | --- |
| #45 publish & version | Flows 3.1, 3.2 — `POST /mcps` |
| #48 list & search | Flow 3.3 — `GET /mcps`, detail views |
| #53 connect an agent | Flow 3.4 — connection details (needs #43) |
