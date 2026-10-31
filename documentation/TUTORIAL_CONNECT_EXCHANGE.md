# Guide: Connecting AI Agents to the MCP Exchange (Discovery & Execution)

This guide explains how an AI agent (**Claude**, **Cursor**, **Codex / OpenAI**, **Luna**, etc.) connects to and interacts with the **MCP Exchange** catalogue to dynamically discover and use published MCP servers.

---

## 1. Concept: MCP Creator vs MCP Exchange

| Component | Role | What the Agent Connects To |
| :--- | :--- | :--- |
| **MCP (Generated Server)** | Exposes specific business tools (`check_availability`, `reserve_room`). | Connects directly via SSE (`/api/v1/servers/:id/mcp/sse`) or Stdio bridge. |
| **MCP Exchange** | Central registry / marketplace listing all published MCPs. | Allows the agent to **search**, **discover**, and **resolve connection endpoints** dynamically. |

```
                       ┌───────────────────────────────┐
                       │          AI Agent             │
                       │ (Claude, Codex, Cursor, Luna) │
                       └──────────────┬────────────────┘
                                      │
            Step 1: Discover          │  Step 2: Connect & Execute
         "Find me a hotel in Basel"   │  "Book room via resolved MCP"
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
   ┌───────────────────────────┐             ┌───────────────────────────┐
   │       MCP Exchange        │             │    Target MCP Server      │
   │  (/api/v1/exchange/mcps)  │             │ (/api/v1/servers/:id/...) │
   │                           │             │                           │
   │ • Search by capability    │             │ • check_availability      │
   │ • Inspect published tools │             │ • reserve_room            │
   │ • Get connection details  │             │ • get_current_status      │
   └───────────────────────────┘             └───────────────────────────┘
```

---

## 2. MCP Exchange API Reference

The Exchange exposes standard REST endpoints for cataloguing and discovering MCP servers:

| Endpoint | Method | Purpose | Example |
| :--- | :--- | :--- | :--- |
| `/api/v1/exchange/mcps` | `GET` | List all published MCPs (summaries) | `curl http://localhost:3000/api/v1/exchange/mcps` |
| `/api/v1/exchange/mcps?q={query}` | `GET` | Search by site, URL, or tool capability | `curl "http://localhost:3000/api/v1/exchange/mcps?q=reserve"` |
| `/api/v1/exchange/mcps/:entryId` | `GET` | Detail of an MCP entry with all its versions | `curl http://localhost:3000/api/v1/exchange/mcps/ex_localhost-3000-mock-hotel_89bc5b29` |
| `/api/v1/exchange/mcps/:entryId/versions/:v` | `GET` | Specific version details + call endpoint | `curl http://localhost:3000/api/v1/exchange/mcps/ex_.../versions/1` |

### Sample Response (`GET /api/v1/exchange/mcps?q=hotel`):

```json
[
  {
    "entry_id": "ex_grand-hotel-basel_ luxury_47a1bc",
    "source_url": "https://hotel.example.com",
    "site_title": "Grand Hotel Basel",
    "description": "Official booking tools for Grand Hotel Basel suites",
    "latest_version": 1,
    "versions_count": 1,
    "published_at": "2026-10-31T14:00:00.000Z",
    "tool_names": [
      "check_availability",
      "reserve_room",
      "get_current_status"
    ]
  }
]
```

---

## 3. Dynamic Agent Flow: Discovery to Execution (Python / Codex / LangChain)

Here is a complete, working script showing how an agent dynamically queries the Exchange, finds the right MCP for the user's intent, and calls its tools.

```python
import requests
import json

EXCHANGE_BASE_URL = "http://localhost:3000/api/v1"

def search_exchange(query: str):
    """1. Search the MCP Exchange for servers matching user intent."""
    response = requests.get(f"{EXCHANGE_BASE_URL}/exchange/mcps", params={"q": query})
    response.raise_for_status()
    results = response.json()
    return results

def get_connection_info(entry_id: str, version: int = None):
    """2. Retrieve connection details and tools schema from the Exchange."""
    if version:
        url = f"{EXCHANGE_BASE_URL}/exchange/mcps/{entry_id}/versions/{version}"
    else:
        url = f"{EXCHANGE_BASE_URL}/exchange/mcps/{entry_id}"
    
    response = requests.get(url)
    response.raise_for_status()
    data = response.json()
    
    # Extract latest version details
    if "versions" in data:
        latest = data["versions"][-1]
    else:
        latest = data
        
    return {
        "server_id": latest["server_id"],
        "tools": latest["tools"],
        "call_endpoint": f"{EXCHANGE_BASE_URL}{latest['call_endpoint']}",
        "sse_endpoint": f"{EXCHANGE_BASE_URL}/servers/{latest['server_id']}/mcp/sse",
    }

# ==========================================
# Example Agent Run
# ==========================================
if __name__ == "__main__":
    user_query = "reserve a room in Basel"
    print(f"Agent received: '{user_query}'")
    
    # Step 1: Discover available MCPs on the Exchange
    matches = search_exchange("hotel")
    if not matches:
        print("No matching MCP found on Exchange.")
        exit(1)
        
    chosen = matches[0]
    print(f"\nDiscovered MCP: {chosen['site_title']} ({chosen['entry_id']})")
    print(f"Available tools: {chosen['tool_names']}")
    
    # Step 2: Get connection details
    conn = get_connection_info(chosen["entry_id"])
    print(f"\nConnection details resolved:")
    print(f"  • Server ID:    {conn['server_id']}")
    print(f"  • SSE Transport: {conn['sse_endpoint']}")
    print(f"  • Direct Call:   {conn['call_endpoint']}")
    
    # Step 3: Execute tool via Direct Call or SSE
    print("\nExecuting 'check_availability' tool via resolved endpoint...")
    call_payload = {
        "tool_name": "check_availability",
        "arguments": {
            "check_in": "2026-11-05",
            "check_out": "2026-11-08",
            "guests": 2
        }
    }
    
    call_res = requests.post(conn["call_endpoint"], json=call_payload)
    print("\nLive Execution Result from Website:")
    print(json.dumps(call_res.json(), indent=2))
```

---

## 4. Connecting AI Agents using the Exchange as a Tool (Meta-MCP)

You can also equip agents with **Exchange Discovery Tools** so the agent autonomously discovers new capabilities on the fly.

### OpenAI Function Calling / Codex Tool Definitions:

```json
[
  {
    "type": "function",
    "function": {
      "name": "search_mcp_exchange",
      "description": "Search the MCP Exchange directory for servers providing actions on specific websites or domains.",
      "parameters": {
        "type": "object",
        "properties": {
          "q": {
            "type": "string",
            "description": "Search term (e.g. 'hotel', 'flight', 'booking')"
          }
        },
        "required": ["q"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "get_exchange_mcp_tools",
      "description": "Get the list of tools and endpoints for a published MCP server from the Exchange.",
      "parameters": {
        "type": "object",
        "properties": {
          "entry_id": {
            "type": "string",
            "description": "Exchange entry ID returned from search_mcp_exchange"
          }
        },
        "required": ["entry_id"]
      }
    }
  }
]
```

---

## 5. Connecting via Claude Desktop or Cursor from the Exchange

When you find an MCP on the Exchange web interface or API:
1. Copy its `server_id` (e.g. `mcp_grand_hotel_basel_luxury_comfort_1793435670219`).
2. **In Cursor (SSE)**:
   - Add new MCP server:
   - Type: `sse`
   - URL: `http://localhost:3000/api/v1/servers/<server_id>/mcp/sse`
3. **In Claude Desktop (stdio)**:
   - Add to `claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "hotel-exchange-server": {
         "command": "node",
         "args": [
           "/absolute/path/to/code/backend/bin/mcp-runner.mjs",
           "<server_id>"
         ],
         "env": {
           "MCP_BACKEND_URL": "http://localhost:3000"
         }
       }
     }
   }
   ```

---

## 6. Summary

Connecting the **MCP Exchange** allows an agent to go from:
> *"I only know how to browse the web"*  
to  
> *"I search the Exchange, find the official MCP for this website, connect to its typed tools, and execute verified actions directly."*
