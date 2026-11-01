<p align="center">
  <img src="../../assets/logo.png" alt="MCPEX logo" width="96">
</p>

<h1 align="center">MCPEX frontend</h1>

<p align="center">
  <strong>The React dashboard for creating and managing MCP servers.</strong>
</p>

<p align="center">
  <a href="../../readme.md">MCPEX</a> ·
  <a href="../../documentation/local-setup.md">Setup guide</a> ·
  <a href="../backend/README.md">Backend</a> ·
  <a href="../infra/README.md">Infrastructure</a>
</p>

---

## Overview

Built with React and Vite, and styled with Adobe Spectrum 2 icons and design conventions.

## Quick start

You need Node.js and npm. From `code/frontend`:

```bash
npm ci
npm run dev
```

The app runs on http://localhost:5173.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run build` | Create a production build in `dist/`. |
| `npm run preview` | Preview the production build locally. |

## Interface

- Home page that generates an MCP from a website URL, with an optional interactive login for sites that need one. The result can be enriched with GitHub or WordPress data.
- MCP server list with search, status filters and pagination.
- Details drawer to manage a server's routes and copy its MCP endpoint.

The interface is in English by default. Switch between English and French with the control in the header.

## Backend connection

The Vite development server proxies `/api`, `/mock-hotel`, and `/static` to `https://api.bh2026.tekitup.net` by default. Set `MCPEX_BACKEND_URL` to use a local or alternate backend, for example:

```bash
MCPEX_BACKEND_URL=http://localhost:3001 npm run dev
```

The frontend calls the generation, server, OAuth connection, enrichment, and enable/disable endpoints. Register the GitHub and WordPress.com OAuth applications with the callback URLs listed in the backend README. Configure their client credentials and `MCPEX_FRONTEND_URL` in the backend environment. For a deployed frontend, set `VITE_API_BASE_URL` to the full API base URL.

Provider access tokens stay in frontend memory and must be reconnected after a page reload.
