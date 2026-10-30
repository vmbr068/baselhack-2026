# Local setup

Run each service in its own terminal, from the repository root.

| Service | Folder | URL |
| --- | --- | --- |
| Backend (NestJS) | `code/backend` | http://localhost:3000 |
| MCP creator (FastAPI) | `code/mcp_creator` | http://localhost:8000 |

## Prerequisites

- Node.js 24 and npm
- Python 3.13

## Backend

```bash
cd code/backend
npm ci
npm run start:dev
```

Check: `curl localhost:3000` returns `Hello World!`.

## MCP creator

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

## Secrets

No secret is needed to run the services. `code/mcp_creator/agent_demo.py` uses
Gemini only if `GEMINI_API_KEY` is set in your shell, and otherwise falls back to
its local engine. Never commit a key.
