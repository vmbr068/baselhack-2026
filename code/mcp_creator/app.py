import os
import json
from pathlib import Path
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

try:
    from .models import (
        WebScanResult,
        MCPServerConfig,
        ToolCallRequest,
        ToolCallResponse
    )
    from .scanner import scan_website
    from .synthesizer import synthesize_mcp_server
    from .codegen import generate_standalone_mcp_script
    from .executor import execute_tool
except ImportError:
    from models import (
        WebScanResult,
        MCPServerConfig,
        ToolCallRequest,
        ToolCallResponse
    )
    from scanner import scan_website
    from synthesizer import synthesize_mcp_server
    from codegen import generate_standalone_mcp_script
    from executor import execute_tool

app = FastAPI(
    title="MCP Exchange - Dynamic Hotel MCP Factory",
    description="Backend service that scans hotel websites and dynamically generates & hosts Model Context Protocol (MCP) wrapper servers.",
    version="1.0.0"
)

# Directories
BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
SCREENSHOT_DIR = STATIC_DIR / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
MOCK_DIR = BASE_DIR / "mock_hotel"

# Static files for screenshots
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# In-memory storage and disk persistence for generated MCP servers
SERVERS_DIR = BASE_DIR / "generated_servers"
SERVERS_DIR.mkdir(parents=True, exist_ok=True)
SERVERS_STORE: Dict[str, MCPServerConfig] = {}

def save_server_config(config: MCPServerConfig):
    SERVERS_STORE[config.server_id] = config
    json_path = SERVERS_DIR / f"{config.server_id}.json"
    json_path.write_text(config.model_dump_json(indent=2), encoding="utf-8")

def get_server_config(server_id: str) -> Optional[MCPServerConfig]:
    if server_id in SERVERS_STORE:
        return SERVERS_STORE[server_id]
    
    # Try exact disk match
    json_path = SERVERS_DIR / f"{server_id}.json"
    if json_path.exists():
        try:
            data = json.loads(json_path.read_text(encoding="utf-8"))
            config = MCPServerConfig(**data)
            SERVERS_STORE[server_id] = config
            return config
        except Exception:
            pass

    # Try "latest" or partial prefix match
    json_files = sorted(SERVERS_DIR.glob("*.json"), key=os.path.getmtime, reverse=True)
    if server_id == "latest" and json_files:
        try:
            data = json.loads(json_files[0].read_text(encoding="utf-8"))
            config = MCPServerConfig(**data)
            SERVERS_STORE[config.server_id] = config
            return config
        except Exception:
            pass

    for f in json_files:
        if server_id in f.stem:
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                config = MCPServerConfig(**data)
                SERVERS_STORE[config.server_id] = config
                return config
            except Exception:
                pass
    return None

# Load previously saved servers into memory on startup
for _f in SERVERS_DIR.glob("*.json"):
    try:
        _d = json.loads(_f.read_text(encoding="utf-8"))
        _cfg = MCPServerConfig(**_d)
        SERVERS_STORE[_cfg.server_id] = _cfg
    except Exception:
        pass

class ScanRequest(BaseModel):
    url: str

class GenerateResponse(BaseModel):
    server_id: str
    hotel_name: str
    target_url: str
    tools: List[dict]
    standalone_script_path: str
    call_endpoint: str
    mcp_schema: dict

@app.get("/mock-hotel", response_class=HTMLResponse)
async def serve_mock_hotel():
    """Serves a local mock hotel page for instant offline testing."""
    mock_file = MOCK_DIR / "index.html"
    if not mock_file.exists():
        raise HTTPException(status_code=404, detail="Mock hotel page not found")
    return HTMLResponse(content=mock_file.read_text(encoding="utf-8"))

@app.post("/api/v1/scan", response_model=WebScanResult)
async def scan_endpoint(req: ScanRequest):
    """
    Scans a hotel website with Playwright, extracting forms, inputs, buttons,
    and visible room cards.
    """
    try:
        scan_res = await scan_website(req.url)
        return scan_res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scanning failed: {str(e)}")

@app.post("/api/v1/generate", response_model=GenerateResponse)
async def generate_endpoint(req: ScanRequest):
    """
    Scans a website, analyzes the reservation flow, and dynamically creates
    an MCP wrapper server with actionable tools.
    """
    try:
        scan_res = await scan_website(req.url)
        config = synthesize_mcp_server(scan_res)
        script_path = generate_standalone_mcp_script(config)

        # Store in registry and persist to disk
        save_server_config(config)

        return GenerateResponse(
            server_id=config.server_id,
            hotel_name=config.hotel_name,
            target_url=config.target_url,
            tools=[t.model_dump() for t in config.tools],
            standalone_script_path=str(script_path),
            call_endpoint=f"/api/v1/servers/{config.server_id}/call",
            mcp_schema={
                "name": config.hotel_name,
                "server_id": config.server_id,
                "tools": [
                    {
                        "name": t.name,
                        "description": t.description,
                        "inputSchema": t.parameters
                    }
                    for t in config.tools
                ]
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MCP Generation failed: {str(e)}")

@app.get("/api/v1/servers", response_model=List[MCPServerConfig])
async def list_servers():
    """Lists all dynamically generated MCP servers registered in the exchange."""
    return list(SERVERS_STORE.values())

@app.get("/api/v1/servers/{server_id}", response_model=MCPServerConfig)
async def get_server(server_id: str):
    """Retrieves full tool schema and configuration for a specific MCP server."""
    config = get_server_config(server_id)
    if not config:
        raise HTTPException(status_code=404, detail="Server ID not found")
    return config

@app.post("/api/v1/servers/{server_id}/call", response_model=ToolCallResponse)
async def call_tool_endpoint(server_id: str, req: ToolCallRequest):
    """
    Executes an MCP tool call (e.g. check_availability or reserve_room)
    using Playwright on the target website.
    """
    config = get_server_config(server_id)
    if not config:
        raise HTTPException(
            status_code=404,
            detail=f"Server ID '{server_id}' not found. Available servers: {list(SERVERS_STORE.keys()) or 'None (run /api/v1/generate first)'}"
        )

    result = await execute_tool(
        config=config,
        tool_name=req.tool_name,
        arguments=req.arguments,
        headless=True
    )
    return result

@app.get("/", response_class=HTMLResponse)
async def dashboard():
    """Interactive visual dashboard for testing and demoing the MCP Creator."""
    return HTMLResponse(content="""<!DOCTYPE html>
<html>
<head>
    <title>MCP Exchange - Dynamic MCP Creator</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
        .card { background: #1e293b; border-radius: 10px; padding: 1.5rem; max-width: 900px; margin: 0 auto 1.5rem auto; border: 1px solid #334155; }
        h1, h2 { color: #38bdf8; }
        input, button { padding: 0.75rem 1rem; border-radius: 6px; border: none; font-size: 1rem; }
        input { width: 70%; background: #0f172a; color: white; border: 1px solid #475569; }
        button { background: #38bdf8; color: #0f172a; font-weight: bold; cursor: pointer; }
        button:hover { background: #7dd3fc; }
        pre { background: #0f172a; padding: 1rem; border-radius: 6px; overflow-x: auto; color: #a5f3fc; }
        .badge { background: #0284c7; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🌐 MCP Exchange - Dynamic Hotel MCP Factory</h1>
        <p>Convert any hotel website into an AI-ready Model Context Protocol (MCP) server.</p>
        <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
            <input type="text" id="target-url" value="http://localhost:8000/mock-hotel" placeholder="Enter Hotel Website URL" />
            <button onclick="generateMCP()">Generate MCP</button>
        </div>
        <p style="margin-top: 0.5rem; font-size: 0.85rem; color: #94a3b8;">
            Quick link: <a href="/mock-hotel" target="_blank" style="color: #38bdf8;">View local Mock Hotel page</a> | 
            <a href="/docs" target="_blank" style="color: #38bdf8;">Interactive OpenAPI Docs</a>
        </p>
    </div>

    <div class="card" id="output-card" style="display: none;">
        <h2>⚡ Generated MCP Server</h2>
        <div id="summary"></div>
        
        <div style="margin-top: 1.5rem; border-top: 1px solid #334155; padding-top: 1.5rem;">
            <h3>🛠️ Execute MCP Tools Live</h3>
            <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 1rem;">Test the generated tools below. Playwright will execute the actions in the background.</p>
            
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <!-- Tool 1: Availability -->
                <div style="background: #0f172a; padding: 1rem; border-radius: 8px; flex: 1; min-width: 280px; border: 1px solid #334155;">
                    <h4 style="color: #38bdf8;">1. check_availability</h4>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
                        <input type="date" id="exec-checkin" value="2026-11-05" style="width: 90%;">
                        <input type="date" id="exec-checkout" value="2026-11-08" style="width: 90%;">
                        <input type="number" id="exec-guests" value="2" min="1" max="10" placeholder="Guests" style="width: 90%;">
                        <button onclick="executeAvailability()" style="margin-top: 0.5rem; background: #0284c7; color: white;">Run check_availability</button>
                    </div>
                </div>

                <!-- Tool 2: Reserve -->
                <div style="background: #0f172a; padding: 1rem; border-radius: 8px; flex: 1; min-width: 280px; border: 1px solid #334155;">
                    <h4 style="color: #38bdf8;">2. reserve_room</h4>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
                        <input type="text" id="exec-room" value="Deluxe Rhine View Suite" placeholder="Room Title" style="width: 90%;">
                        <input type="text" id="exec-name" value="Sacha Ramstein" placeholder="Guest Full Name" style="width: 90%;">
                        <input type="email" id="exec-email" value="sacha@baselhack.ch" placeholder="Guest Email" style="width: 90%;">
                        <button onclick="executeReservation()" style="margin-top: 0.5rem; background: #16a34a; color: white;">Run reserve_room</button>
                    </div>
                </div>
            </div>

            <!-- Execution Result & Screenshot Box -->
            <div id="exec-result-box" style="margin-top: 1.5rem; display: none;">
                <h4>Execution Result</h4>
                <div id="exec-status" style="margin: 0.5rem 0; font-weight: bold;"></div>
                <div id="exec-img-container" style="margin: 1rem 0;"></div>
                <pre id="exec-json"></pre>
            </div>
        </div>

        <h3 style="margin-top: 1.5rem;">📋 Generated MCP Schema</h3>
        <pre id="output-json"></pre>
    </div>

    <script>
        let currentServerId = null;

        async function generateMCP() {
            const url = document.getElementById('target-url').value;
            const outputCard = document.getElementById('output-card');
            const summary = document.getElementById('summary');
            const outputJson = document.getElementById('output-json');

            outputCard.style.display = 'block';
            summary.innerHTML = '<em>Scanning website with Playwright and synthesizing MCP tools...</em>';
            outputJson.innerText = '';
            document.getElementById('exec-result-box').style.display = 'none';

            try {
                const res = await fetch('/api/v1/generate', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ url })
                });
                const data = await res.json();
                currentServerId = data.server_id;
                summary.innerHTML = `<h3>Server ID: <span class="badge">${data.server_id}</span></h3>
                                     <p>Hotel: <strong>${data.hotel_name}</strong> | Tools Available: <strong>${data.tools.length}</strong></p>`;
                outputJson.innerText = JSON.stringify(data, null, 2);
            } catch (err) {
                summary.innerHTML = `<span style="color: #f87171;">Error: ${err.message}</span>`;
            }
        }

        async function executeAvailability() {
            if (!currentServerId) return alert('Please generate an MCP server first.');
            showExecLoading('Checking availability with Playwright...');
            
            const check_in = document.getElementById('exec-checkin').value;
            const check_out = document.getElementById('exec-checkout').value;
            const guests = parseInt(document.getElementById('exec-guests').value) || 2;

            try {
                const res = await fetch(`/api/v1/servers/${currentServerId}/call`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        tool_name: 'check_availability',
                        arguments: { check_in, check_out, guests }
                    })
                });
                const data = await res.json();
                displayExecResult(data);
            } catch (err) {
                displayExecError(err.message);
            }
        }

        async function executeReservation() {
            if (!currentServerId) return alert('Please generate an MCP server first.');
            showExecLoading('Submitting reservation with Playwright...');

            const room_title = document.getElementById('exec-room').value;
            const guest_name = document.getElementById('exec-name').value;
            const guest_email = document.getElementById('exec-email').value;

            try {
                const res = await fetch(`/api/v1/servers/${currentServerId}/call`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        tool_name: 'reserve_room',
                        arguments: {
                            room_title,
                            guest_name,
                            guest_email,
                            guest_phone: '+41 79 123 45 67',
                            special_requests: 'Quiet room please'
                        }
                    })
                });
                const data = await res.json();
                displayExecResult(data);
            } catch (err) {
                displayExecError(err.message);
            }
        }

        function showExecLoading(msg) {
            const box = document.getElementById('exec-result-box');
            box.style.display = 'block';
            document.getElementById('exec-status').innerHTML = `<span style="color: #38bdf8;">⏳ ${msg}</span>`;
            document.getElementById('exec-img-container').innerHTML = '';
            document.getElementById('exec-json').innerText = '';
        }

        function displayExecResult(data) {
            const statusEl = document.getElementById('exec-status');
            const imgContainer = document.getElementById('exec-img-container');
            const jsonEl = document.getElementById('exec-json');

            if (data.success) {
                statusEl.innerHTML = `<span style="color: #4ade80;">✅ Tool '${data.tool_name}' Executed Successfully!</span>`;
            } else {
                statusEl.innerHTML = `<span style="color: #f87171;">❌ Tool Execution Failed: ${data.error || 'Unknown error'}</span>`;
            }

            if (data.screenshot_url) {
                imgContainer.innerHTML = `<p style="font-size:0.85rem; color:#94a3b8; margin-bottom:0.3rem;">Visual Proof (Captured Live by Playwright):</p>
                                          <img src="${data.screenshot_url}" style="max-width: 100%; border-radius: 8px; border: 1px solid #475569;" />`;
            }

            jsonEl.innerText = JSON.stringify(data, null, 2);
        }

        function displayExecError(msg) {
            document.getElementById('exec-status').innerHTML = `<span style="color: #f87171;">❌ Error: ${msg}</span>`;
        }
    </script>
</body>
</html>
""")
