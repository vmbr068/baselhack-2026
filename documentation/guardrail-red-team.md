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

The red team then found two more holes, both fixed:

- **The agent could approve its own link.** The link reaches the agent too, so
  holding it proved nothing. Now only a browser logged in with the approver
  password can approve, and the agent never sees that password. Five wrong
  passwords lock the login for 15 minutes.
- **A write tool could skip approval.** A `POST` route that the generator took
  for a search ran without approval. Now only reads skip it: any API call
  other than `GET` needs a human, as do names such as `order`, `checkout` or
  `cancel`.

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
| 15 | Approve its own link (GET, then POST without login) | Login asked, approval refused |
| 16 | Approve with a forged approver cookie | Refused |
| 17 | Guess the approver password | Locked after 5 tries, even with the right password |
| 18 | Call a write API tool the generator did not flag | Blocked, approval link returned |

To check that the tests can catch a real hole, we put each hole back in the
code, one at a time: self-approval, an approval without login, and a write tool
without approval. The suite failed every time.

Run it: `cd code/backend && npx vitest run --config ./vitest.config.e2e.ts test/guardrail.e2e-spec.ts`

## Known limits

- **Pending approvals and approver logins are kept in memory.** A restart
  clears them: the approver logs in again and the agent asks again.
- **Someone guessing passwords can lock the approver login for 15 minutes.**
  Log in before the demo; the session lasts 12 hours.
- **A `GET` route that writes** (bad API design) and is not named like a
  booking would still skip approval.

## For the pitch

> "We tried to break our own safety rule. On the first try, the agent could
> approve itself, so we fixed it. Now 18 bypass attempts fail, and in each one
> the hotel site is never even touched. Only the human, logged in with a
> password the agent never sees, can click Approve and make a booking happen."
