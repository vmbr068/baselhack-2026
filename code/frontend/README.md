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

- Home page with a website URL field and a local analysis flow.
- MCP list with search, status filters, route details, and route toggles.
- Activity journal for MCP creation, route changes, and synchronization events.
- Sign-in and sign-up screens with a French/English language switch.

The interface is in French by default. Switch languages with the control at the bottom of the sidebar.

## Frontend-only behavior

This project does not include a backend or real authentication. Website analysis, account actions, MCP records, routes, and activity entries are local interface examples. Submitting a URL does not contact that website. The sample sites use reserved `.example` domains.
