# Remaining demo work

Status of assigned issues #50, #55, #56, #57 and #58 as of 2026-10-31.

## Still to do (needs the deployed env or a human on stage)

- [ ] **#55 — Validate the full *deployed* scenario.** Locally the whole flow works (see below); what remains is running it on the deployed environment, agent-connected, with explicit human confirmation and the booking visible on the demo site. Use only fictional guest details.
- [ ] **#56 — Repeat the ten runs agent-connected on deployed.** The local full REST pipeline is 10/10 (see [demo-reliability.md](demo-reliability.md)); the remaining requirement is ten agent-driven runs with human approval on the deployed site.
- [ ] **#57 — Record a successful demo video.** The pre-generated MCP and fallback instructions are ready. Record a successful run as `assets/demo-fallback.mp4`, then make sure both presenters know when and how to switch to the fallback.

## Verified locally on 2026-10-31

- **#50 — Agent connection:** generated MCP exposes `check_availability` and `reserve_room`; the local pipeline lists both and runs a search returning three rooms. Codex also listed the tools and searched over stdio.
- **#55 (local part) — Full flow:** generate → search → reserve succeeds end to end against the mock hotel, producing a confirmation number. The human-approval gate (`test_agent_confirmation.py`) passes 2/2.
- **#56 (local part) — Reliability:** 10/10 full REST runs, three rooms each, ~10.4 s per run. Reproduce with `scratchpad/reliability_run.py`.
- **#58 — Demo script:** steps, speakers, actions, inputs, and fallback points documented in [demo-script.md](demo-script.md).

## Notes before tomorrow's validation

- Local checks used an isolated Python 3.14 venv with Playwright `chromium-headless-shell`; the project requests Python 3.13.
- Use a cleanup path for demo bookings before testing the deployed booking flow. Each deployed tool action currently leaves a screenshot artifact, and no deletion route was found; no booking was made against the deployed site during this work.
- Keep the ten deployed full-flow runs distinct from search-only REST or MCP smoke checks.
