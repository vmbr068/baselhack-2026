# Connect an AI agent to a generated hotel MCP

This guide uses the local FastAPI MCP creator in `code/mcp_creator`. It
generates a FastMCP stdio server for the built-in fictional hotel; it does not
connect an agent to the deployed NestJS REST API.

## Generate the server

Start the MCP creator using the local setup instructions, then generate a
server for the mock hotel:

```sh
curl -X POST http://localhost:8000/api/v1/generate \
  -H 'content-type: application/json' \
  -d '{"url":"http://localhost:8000/mock-hotel"}'
```

Keep the returned `standalone_script_path`. The generated script is the MCP
server the desktop agent will start over stdio.

## Configure Claude Desktop

In Claude Desktop's MCP server configuration, add an entry like this. Replace
both example paths with absolute paths on the machine running Claude Desktop;
the Python executable must have the dependencies from
`code/mcp_creator/requirements.txt` installed. Use the generated
`standalone_script_path` for a live scan, or
`code/mcp_creator/fallback_server.py` for the prepared mock-hotel fallback.

```json
{
  "mcpServers": {
    "baselhack-hotel": {
      "command": "/absolute/path/to/code/mcp_creator/venv/bin/python",
      "args": [
        "/absolute/path/to/code/mcp_creator/generated_servers/<server_id>.py"
      ]
    }
  }
}
```

Restart Claude Desktop. In a new conversation, ask it to list the available
tools, then search for two guests for 5–8 November 2026. The generated server
should expose `check_availability` and `reserve_room`.

For the demo, instruct the agent to search first and ask the person for
explicit approval before calling `reserve_room`. Use only the mock hotel and
fictional guest details.
