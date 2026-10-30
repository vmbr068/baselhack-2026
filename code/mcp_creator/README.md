# Dynamic Hotel MCP Creator (Backend for MCP Exchange)

> An autonomous tool that scans hotel booking websites and dynamically synthesizes a **Model Context Protocol (MCP)** server wrapper driven by **Playwright**.

Built for **BaselHack 2026**.

---

## 🏗️ Architecture

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

---

## 🚀 Getting Started

### 1. Activate Environment
```bash
source code/mcp_creator/venv/bin/activate
```

### 2. Start the MCP Exchange Backend
```bash
python -m code.mcp_creator.cli
# Or: uvicorn code.mcp_creator.app:app --port 8000 --reload
```

Open your browser at:
- **Interactive Dashboard**: `http://localhost:8000`
- **Swagger API Docs**: `http://localhost:8000/docs`
- **Built-in Mock Hotel**: `http://localhost:8000/mock-hotel`

---

## 📡 API Endpoints for MCP Exchange

### 1. `POST /api/v1/generate`
Scans a target website and creates a ready-to-use MCP wrapper server.
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

### 2. `POST /api/v1/servers/{server_id}/call`
Executes an MCP tool on the target hotel website via Playwright:
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
    "guest_name": "Sacha Ramstein",
    "guest_email": "sacha@example.com",
    "guest_phone": "+41 79 123 45 67",
    "special_requests": "High floor with river view"
  }
}
```

The response includes:
- Live confirmation details from the page.
- URL to the screenshot proof of reservation.

---

## 🛠️ CLI Quick Scan
```bash
python -m code.mcp_creator.cli scan http://localhost:8000/mock-hotel
```
