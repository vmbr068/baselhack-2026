# MCPEX frontend

React frontend for the MCPEX workspace, built with Vite and styled with Adobe Spectrum 2 icons and design conventions.

## Requirements

- Node.js
- npm

## Run locally

From this directory (`code/frontend`):

```sh
npm install
npm run dev
```

Vite prints the local URL when the development server starts.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run build` | Create a production build in `dist/`. |
| `npm run preview` | Preview the production build locally. |

## Interface

- Home page that generates an MCP from a website URL and can enrich it with GitHub or WordPress data when the scan finds little page structure.
- MCP list loaded from the backend, with details and tools/routes loaded on demand.
- Activity view derived from server creation and code enrichment timestamps returned by the backend.
- Sign-in and sign-up screens with a French/English language switch.

The interface is in French by default. Switch languages with the control at the bottom of the sidebar.

## Backend connection

The Vite development server proxies `/api`, `/mock-hotel`, and `/static` to `https://api.bh2026.tekitup.net` by default. Set `MCPEX_BACKEND_URL` to use a local or alternate backend, for example:

```sh
MCPEX_BACKEND_URL=http://localhost:3001 npm run dev
```

The frontend calls the generation, server, OAuth connection, enrichment, and enable/disable endpoints. Register the GitHub and WordPress.com OAuth applications with the callback URLs listed in the backend README. Configure their client credentials and `MCPEX_FRONTEND_URL` in the backend environment. For a deployed frontend, set `VITE_API_BASE_URL` to the full API base URL.

Provider access tokens stay in frontend memory and must be reconnected after a page reload. Sign-in/sign-up for MCPEX and the activity log are not backed by account endpoints; the activity view derives entries from server creation and enrichment timestamps.
