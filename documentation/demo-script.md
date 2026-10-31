# Live demo script

**Target length:** 4 minutes  
**Speakers:** Adam (presenter), Corentin (agent operator)  
**Data:** the local fictional hotel only; use the sample values below.

## Before the audience arrives

- Open the MCP Creator dashboard at `http://localhost:8000` and the mock hotel
  at `http://localhost:8000/mock-hotel`.
- Make sure the MCP creator is using the local setup in
  [`local-setup.md`](local-setup.md). Configure the prepared
  [`fallback_server.py`](../code/mcp_creator/fallback_server.py) before the
  demo; generate the live server during the walkthrough.
- Start Claude Desktop with the generated server configured as described in
  [`agent-connection.md`](agent-connection.md). Confirm it can list
  `check_availability` and `reserve_room`.
- Keep the cancel path available: if the booking confirmation is not shown,
  cancel and switch to the fallback plan. Never claim that an unconfirmed
  booking succeeded.

## Run of show

| Time | Speaker | Say | Show / do |
| --- | --- | --- | --- |
| 0:00 | Adam | “Most hotel sites do not expose tools an AI agent can use. We built a creator that scans our fictional hotel and generates those tools.” | Show the mock hotel in one browser tab and the Creator dashboard in another. |
| 0:30 | Corentin | “I’ll give the creator the hotel URL. It will inspect the page and produce an MCP server with the actions it found.” | Submit `http://localhost:8000/mock-hotel` in the dashboard. Point out the generated server ID and `check_availability` / `reserve_room` tools. |
| 1:30 | Adam | “The agent can now use the hotel’s tools. First, it checks availability for the requested dates.” | Show Claude Desktop’s connected `baselhack-hotel` MCP and ask: `Find a room in Basel for 2 guests from 2026-11-05 to 2026-11-08.` Show the tool call and room results. |
| 2:30 | Corentin | “Before it makes a booking, the agent must show the details and ask the person. Nothing is submitted until the person confirms.” | Ask Claude to reserve the `Deluxe Rhine View Suite` for `Ada Example`, `ada@example.invalid`, phone `+41790000000`. Pause at the approval request. The operator explicitly approves only this fictional booking. |
| 3:30 | Adam | “The booking has been made on our mock site. The same flow can be exposed for other sites once they provide no API or MCP themselves.” | Show the hotel confirmation in the browser and the returned tool result. Do not show real personal or payment data. |

## Prepared inputs

```text
Hotel URL: http://localhost:8000/mock-hotel
Check-in: 2026-11-05
Check-out: 2026-11-08
Guests: 2
Room: Deluxe Rhine View Suite
Guest: Ada Example
Email: ada@example.invalid
Phone: +41790000000
Special request: Quiet room with a river view
```

## Switch points

- If scanning or MCP generation takes longer than 20 seconds, use the
  pre-generated server from the fallback plan.
- If Claude does not list both tools after restarting, switch to the local
  agent demo and show availability search only.
- If the confirmation prompt or hotel response is missing, stop before
  `reserve_room`, show the prepared fallback, and describe the expected step;
  do not report a successful booking.
