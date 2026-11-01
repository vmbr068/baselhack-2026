<p align="center">
  <img src="../../assets/logo.png" alt="MCPEX logo" width="96">
</p>

<h1 align="center">MCPEX standalone creator</h1>

<p align="center">
  <strong>A Python version of the MCP creator, built with FastAPI and Playwright.</strong>
</p>

<p align="center">
  <a href="../../readme.md">MCPEX</a> ·
  <a href="../../documentation/local-setup.md">Setup guide</a> ·
  <a href="../backend/README.md">Backend</a>
</p>

---

## Overview

This optional service scans hotel booking websites and generates an MCP server wrapper for them. It runs separately from the [NestJS backend](../backend/README.md), which the MCPEX app uses.

## Quick start

Install it by following the [setup guide](../../documentation/local-setup.md#standalone-mcp-creator-optional), then start it from `code/mcp_creator`:

```bash
venv/bin/python -m uvicorn app:app --port 8000 --reload
```

| Page | URL |
| --- | --- |
| Dashboard | http://localhost:8000 |
| API docs | http://localhost:8000/docs |
| Test hotel | http://localhost:8000/mock-hotel |

## Project structure

```
code/mcp_creator/
├── app.py                # FastAPI backend for MCP Exchange (REST API & Dashboard)
├── scanner.py            # Playwright headless scanner (DOM, forms, buttons, rooms)
├── synthesizer.py        # Maps detected UI elements to standardized MCP tool schemas
├── executor.py           # Playwright tool execution engine (dates, rooms, booking)
├── codegen.py            # Generates standalone FastMCP python scripts
├── models.py             # Pydantic models for scan results and MCP schemas
├── cli.py                # Terminal CLI for quick scanning and running the backend
├── mock_hotel/
│   └── index.html        # Built-in test hotel booking website
├── generated_servers/    # Dynamically generated standalone FastMCP scripts
├── static/screenshots/   # Action and booking confirmation screenshots
└── requirements.txt
```

## Endpoints

### `POST /api/v1/generate`

Scans a website and creates a ready-to-use MCP server.

```json
// Request
{
  "url": "http://localhost:8000/mock-hotel"
}

// Response
{
  "server_id": "mcp_grand_hotel_basel_luxury_comfort_1730325000",
  "hotel_name": "Grand Hotel Basel - Luxury & Comfort",
  "target_url": "http://localhost:8000/mock-hotel",
  "tools": [
    {
      "name": "check_availability",
      "description": "Search available hotel rooms and rates...",
      "parameters": { ... }
    },
    {
      "name": "reserve_room",
      "description": "Book a specific room with guest contact details...",
      "parameters": { ... }
    },
    {
      "name": "get_current_status",
      "description": "Capture live webpage state and screenshot...",
      "parameters": { ... }
    }
  ],
  "call_endpoint": "/api/v1/servers/{server_id}/call"
}
```

### `POST /api/v1/servers/{server_id}/call`

Runs an MCP tool on the website with Playwright.

```json
// Check availability
{
  "tool_name": "check_availability",
  "arguments": {
    "check_in": "2026-11-05",
    "check_out": "2026-11-08",
    "guests": 2
  }
}

// Reserve a room
{
  "tool_name": "reserve_room",
  "arguments": {
    "room_title": "Deluxe Rhine View Suite",
    "guest_name": "Jane Doe",
    "guest_email": "jane.doe@example.com",
    "guest_phone": "+41 79 123 45 67",
    "special_requests": "High floor with river view"
  }
}
```

The response includes the confirmation details from the page and a link to a screenshot.

## Scan from the command line

From `code/mcp_creator`:

```bash
venv/bin/python cli.py scan http://localhost:8000/mock-hotel
```
