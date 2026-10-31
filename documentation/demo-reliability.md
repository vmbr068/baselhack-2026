# Demo reliability run log

Use the same hotel URL and search inputs for all ten runs. Record a run as
failed if scanning, generation, tool discovery, search, or the approval gate
fails. A booking attempt counts only after the presenter explicitly approves
the fictional reservation; otherwise mark it `not attempted`.

```text
Hotel: http://localhost:8000/mock-hotel
Dates: 2026-11-05 to 2026-11-08
Guests: 2
Room (booking step): Deluxe Rhine View Suite
Guest (fictional): Ada Example <ada@example.invalid>
```

**Status:** local full flow verified, deployed agent runs still pending.

On 2026-10-31 the full REST pipeline was run ten times in a row against the
built-in mock hotel: each run freshly generated an MCP from the hotel URL, ran
`check_availability`, then ran `reserve_room` with the fictional guest below.
Result: `10 / 10` success, three rooms every time, ~10.4 s per run (10.3–10.5 s).
Validation used an isolated Python 3.14 venv under `/tmp` with Playwright
`chromium-headless-shell`; the project requests Python 3.13. Reproduce with
`scratchpad/reliability_run.py` (generate → search → reserve loop).

| Run | Scan / generation | Tools listed | Search result | Booking result | Latency |
| --- | --- | --- | --- | --- | --- |
| 1 | pass | check_availability, reserve_room | pass, 3 rooms | confirmed (fictional) | 10.3 s |
| 2 | pass | check_availability, reserve_room | pass, 3 rooms | confirmed (fictional) | 10.5 s |
| 3 | pass | check_availability, reserve_room | pass, 3 rooms | confirmed (fictional) | 10.3 s |
| 4 | pass | check_availability, reserve_room | pass, 3 rooms | confirmed (fictional) | 10.4 s |
| 5 | pass | check_availability, reserve_room | pass, 3 rooms | confirmed (fictional) | 10.3 s |
| 6 | pass | check_availability, reserve_room | pass, 3 rooms | confirmed (fictional) | 10.3 s |
| 7 | pass | check_availability, reserve_room | pass, 3 rooms | confirmed (fictional) | 10.3 s |
| 8 | pass | check_availability, reserve_room | pass, 3 rooms | confirmed (fictional) | 10.5 s |
| 9 | pass | check_availability, reserve_room | pass, 3 rooms | confirmed (fictional) | 10.4 s |
| 10 | pass | check_availability, reserve_room | pass, 3 rooms | confirmed (fictional) | 10.4 s |

The booking step here is the automated `reserve_room` REST call, not a
stage run: the human-approval gate is not exercised by this loop. That gate is
covered separately by `test_agent_confirmation.py` (2/2 passing) and must stay
a manual step on stage. Before #56 is closed on the **deployed** environment,
the same ten runs should be done agent-connected, with explicit human approval
before each fictional booking.
