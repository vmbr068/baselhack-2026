# Local setup

Run each service in its own terminal, from the repository root.

| Service | Folder | URL |
| --- | --- | --- |
| Backend (NestJS) | `code/backend` | http://localhost:3000 |
| Frontend (React, Vite) | `code/frontend` | http://localhost:5173 |
| Standalone MCP creator (FastAPI, optional) | `code/mcp_creator` | http://localhost:8000 |

The backend and frontend are all you need to run MCPEX. The Python creator is a
separate implementation with its own API.

## Prerequisites

- Node.js 24 and npm
- Python 3.13

## Backend

```bash
cd code/backend
npm ci
npx playwright install chromium
npm run start:dev
```

Check that generation works:

```bash
curl -X POST localhost:3000/api/v1/generate \
  -H 'content-type: application/json' \
  -d '{"url":"http://localhost:3000/mock-hotel"}'
```

The response lists the generated tools, including `check_availability` and
`reserve_room`.

On NixOS, skip `playwright install` and point `CHROMIUM_PATH` at a Chromium from
Nix.

## Frontend

```bash
cd code/frontend
npm ci
MCPEX_BACKEND_URL=http://localhost:3000 npm run dev
```

Without `MCPEX_BACKEND_URL`, the development server uses the production API.

## Standalone MCP creator (optional)

First run only:

```bash
cd code/mcp_creator
python3 -m venv venv
venv/bin/pip install -r requirements.txt
venv/bin/python -m playwright install chromium
```

Then start it from `code/mcp_creator`:

```bash
venv/bin/python -m uvicorn app:app --port 8000 --reload
```

Check that generation works:

```bash
curl -X POST localhost:8000/api/v1/generate \
  -H 'content-type: application/json' \
  -d '{"url":"http://localhost:8000/mock-hotel"}'
```

The response lists the generated tools, including `check_availability` and
`reserve_room`.

### NixOS

The Python packages and the Chromium downloaded by Playwright expect a standard
Linux filesystem. Enter one before running the commands above (flakes must be
enabled):

```bash
cd code/mcp_creator
$(nix-build fhs.nix --no-out-link)/bin/pw
```

## Environment variables

The backend reads these from its process environment. It does not load a `.env`
file. All of them are optional, apart from the OAuth settings if you use those
providers.

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | Backend port | `3000` |
| `ALLOWED_SITE_ORIGINS` | Comma-separated origins the backend may automate. `*` disables the check: use it only for local debugging | `https://hotel.bh2026.tekitup.net`, `http://localhost:3000` |
| `CHROMIUM_PATH` | Chromium executable | Playwright's browser |
| `PLAYWRIGHT_HEADLESS` | `true` forces headless mode for interactive login | Headless when no display is available |
| `DISPLAY` | X display used for the interactive login window | None |
| `MCPEX_FRONTEND_URL` | Frontend URL for CORS and OAuth redirects | `http://127.0.0.1:5173` for CORS, `http://localhost:5173` for OAuth redirects |
| `PUBLIC_BASE_URL` | Public URL used in Exchange connection details | Taken from the request |

OAuth settings are described in the [backend README](../code/backend/README.md#oauth-configuration).

## Secrets

No secret is needed to run the services. `code/mcp_creator/agent_demo.py` uses
Gemini only if `GEMINI_API_KEY` is set in your shell, and otherwise falls back to
its local engine. Never commit a key.
