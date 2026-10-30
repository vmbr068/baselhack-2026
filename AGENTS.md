# Project context — Name: TBD

> Source of truth for every AI assistant working on this repository
> (Claude, ChatGPT, Gemini, Codex, Cursor…). `CLAUDE.md` and `GEMINI.md` only
> point here — edit this file, never duplicate its content.

## 1. Vision & why

In 5–10 years, people will delegate tasks to AI agents: "book me a hotel room
in Basel for the 14th". Agents cannot click through arbitrary websites
reliably. The answer is MCP (Model Context Protocol): a site exposes typed
tools an agent can call. But most websites have no MCP server, and most will
never build one.

We imagine that future web, and we build the missing bridge.

## 2. Problem & solution

- **Problem**: an AI agent cannot book something on a site that has no MCP.
- **Solution**: an **MCP creator**. Given a website, it analyses the site and
  produces an MCP for it, which any AI agent can then use to perform actions
  (search, book…) on that site.

How the analysis and generation work is deliberately **not decided here**:
technical choices are left to the developers (see section 7).

## 3. MVP / demo scenario

This scenario is the MVP and the definition of "done":

1. We build our own **hotel booking website** (no MCP, no public API).
2. We give its URL to the MCP creator.
3. It analyses the site and generates an MCP exposing at least a room search
   and a room booking.
4. An AI agent (e.g. Claude) books a room through that MCP, live.

## 4. Product principles & guardrails

- **Human confirmation before any irreversible action** (booking, paying):
  the agent must get an explicit confirmation first.
- **Fictitious data only**: no real payment, no real personal data.
- **The demo targets only our own site.** Never automate third-party sites
  without authorisation.
- Safe by design is part of the pitch, not an afterthought.

## 5. Hackathon constraints

- Duration: **2 days**.
- Team: **6 people**, varied developer profiles.
- Deliverable: **pitch + live demo**.
- Consequence: favour a working, demonstrable end-to-end flow over completeness.

## 6. Git workflow

- **One branch per feature**, named `type/short-description`
  (e.g. `feat/hotel-search`), using the same types as commits.
- **A pull request is mandatory** to reach `main`. Never commit directly on
  `main`.
- `main` must always be demonstrable.
- One approval from another team member is enough. Squash merge, delete the
  branch afterwards. Do not leave a PR open more than a few hours.
- **Commits follow Conventional Commits**: `<type>(<scope>): <description>`
  with `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`;
  `(<scope>)` is optional.
- Commits, PR titles and PR descriptions are written in **English**.

## 7. How AI assistants should behave

- Do **not** initialise a stack, framework or tooling, and do not add
  dependencies, unless explicitly asked. Each developer sets up what they need.
- Follow the Git workflow above; never commit on `main`.
- If a product decision is not covered by this file, **ask** rather than guess.
- Respect the guardrails in section 4 in everything you build.

## 8. Glossary

- **MCP (Model Context Protocol)**: open protocol letting an AI agent call
  tools exposed by a server.
- **MCP creator**: our product; generates an MCP for a website that has none.
- **Agent**: an AI assistant acting on behalf of a user.
- **Demo site**: the hotel booking website we build to showcase the creator.
