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

The Vite development server proxies `/api`, `/mock-hotel`, and `/static` to `http://localhost:3000` by default. Set `MCPEX_BACKEND_URL` when the backend runs elsewhere, for example:

```sh
MCPEX_BACKEND_URL=http://localhost:3001 npm run dev
```

The frontend calls `POST /api/v1/generate`, `GET /api/v1/servers`, `GET /api/v1/servers/:id`, and the GitHub/WordPress enrichment endpoints. For a deployed frontend, set `VITE_API_BASE_URL` to the full API base URL (for example `https://api.example.com/api/v1`).

The backend currently has no authentication, MCP route update, or activity log endpoints. Sign-in/sign-up remain interface screens; the activity page can only show events inferred from the server creation and enrichment timestamps available in the API.
