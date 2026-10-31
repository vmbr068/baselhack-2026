# Red-teaming the human confirmation guardrail

Product rule: an agent never books a room unless a human approves it first.
We attacked our own guardrail to check that the rule holds.

## What we found first

Before the fix in #95, an agent could approve itself. It only had to send
`confirmed_by_human: true`, and the room was booked, with no token and no
human involved. The e2e suite at the time even tested this as a feature.

The fix: the agent gets an **approval link** for the human. Only a click on
**Approve** on that page unlocks the booking. The token is random, used once,
valid for 15 minutes and tied to one server and one tool. It books exactly what
the human saw.

## Results

Automated in `code/backend/test/guardrail.e2e-spec.ts` (and
`mcp-creator.e2e-spec.ts` for the flow that should succeed). Every booking goes
through the browser, so each attempt also checks that **the browser never
launched**: nothing reached the hotel site.

| # | Attempt by the agent | Result |
|---|---|---|
| 1 | Book with no confirmation | Blocked, approval link returned |
| 2 | Send `confirmed_by_human: true` (API body) | Ignored, still blocked |
| 3 | Send `confirmed_by_human: "true"` in the tool arguments | Ignored, still blocked |
| 4 | Send made-up flags (`approved`, `human_approved`) | Ignored, still blocked |
| 5 | Self-approve through a real MCP client (the real agent path) | Ignored, still blocked |
| 6 | Use an invented token | Refused |
| 7 | Reuse its own token before the human approved | Still blocked |
| 8 | Open the approval link with GET (as a link preview would) | Not approved |
| 9 | Use a token the human rejected | Refused |
| 10 | Use an approved token on another MCP server | Refused |
| 11 | Use an approved token after 15 minutes | Refused |
| 12 | Swap the room after approval | The approved room is booked, not the new one |
| 13 | Reuse an approved token for a second booking | Refused |
| 14 | Call a look-alike tool (`Reserve_Room`, `reserve-room`) | Refused, unknown tool |

To check that the tests can catch a real hole, we put the old self-approval
back in the code, and the suite failed.

Run it: `cd code/backend && npx vitest run --config ./vitest.config.e2e.ts test/guardrail.e2e-spec.ts`

## Known limits (not fixed yet)

- **The approval link is a bearer link.** Whoever has it can approve. An agent
  that can make HTTP requests could post to its own link. Today, only the
  instruction "never open it yourself" stops it. The fix is to tie approval to
  the human's login.
- **Which tools need approval is a guess.** It covers tools the generator flags
  as irreversible, plus names containing `reserve`, `book` or `pay`. A
  booking tool named, say, `create_order` and not flagged by the generator
  would run without approval.
- **Pending approvals are kept in memory.** A restart clears them, so the human
  has to approve again.

## For the pitch

> "We tried to break our own safety rule. On the first try, the agent could
> approve itself, so we fixed it. Now 14 bypass attempts fail, and in each one
> the hotel site is never even touched. Only a human, clicking Approve, can
> make a booking happen."
