# Demo fallback plan

This plan is for the fictional local hotel only. A pre-generated server is
available at [`fallback_server.py`](../code/mcp_creator/fallback_server.py).
It exposes `check_availability` and `reserve_room`; an MCP stdio client listed
both tools and returned three rooms for the prepared dates. The recording still
needs to be made before this issue can be marked done.

## Prepare the fallback

1. Start the MCP creator so the pre-generated server can reach
   `http://127.0.0.1:8000/mock-hotel`.
2. Configure `code/mcp_creator/fallback_server.py` in Claude Desktop using the
   command and absolute-path format in [`agent-connection.md`](agent-connection.md).
   Restart Claude Desktop and verify the tools are listed.
3. Record one successful full run showing generation, availability search,
   the agent asking for human approval, and the mock hotel's confirmation.
   Save it as `assets/demo-fallback.mp4`.
4. Keep the recording and generated MCP on the demo laptop, and tell both
   presenters where they are before the pitch.

## When to switch

| Failure | Switch |
| --- | --- |
| Live MCP generation fails or takes more than 20 seconds | Connect to the pre-generated local MCP and continue with availability search. |
| The agent does not list both tools after restart | Use the local agent demo for availability search. Do not attempt a booking from an unconnected agent. |
| Booking fails after the human approves the fictional booking | Stop the live attempt and play the recording, once it exists. Say clearly that the recording is the fallback. |
| Neither live flow nor recording is available | Explain the failure and show the generated tool schema; do not claim a booking succeeded. |

The operator must wait for an explicit human approval before any live
`reserve_room` call, even when using the pre-generated server.
