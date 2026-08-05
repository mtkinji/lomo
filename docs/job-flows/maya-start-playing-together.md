---
id: job-flow-maya-start-playing-together
audience: audience-aspirational-family-organizers
persona: Maya
hero_jtbd: jtbd-help-us-enjoy-being-together
last_updated: 2026-08-04
---

# Maya: Start Playing Together

## Situation

Maya notices a small opening for family or friends to spend time together. She wants to turn it into play before coordination, setup, indecision, or account friction makes the moment disappear.

## Job flow

1. Notice an opportunity to play together.
2. Reach or gather the people involved.
3. Open Games and see honest choices.
4. Choose a game everyone can agree on.
5. Join or seat tonight's players.
6. Understand the immediate next action.
7. Play through a fair, responsive shared game.
8. Celebrate and decide whether to play again.
9. Preserve continuity only after it earns the interruption.

## Current Kwilt flow

The unified Kwilt app now owns the Games destination under Play, the complete
guest-first catalog, local setup and play, saved-player continuity, and private
remote tables. Bank hosts can open one table; nearby discovery, QR, link, and
code entry converge on the same server-authoritative seat claim. A returning
participant can re-enter an active table, and committed room changes refresh
from authoritative Postgres state across phones.

## Delivery score

| Step | Score | Rationale |
| --- | --- | --- |
| Notice opportunity | 3 | Games is a first-class unified capability under Play, but Kwilt does not yet help a family notice or resume a good play moment. |
| Reach people | 3 | Foreground nearby discovery, QR, link, and code remove most table coordination; signed-device discovery and remote delivery still need proof. |
| See choices | 4 | The unified shelf presents eleven Games-owned choices and two utilities without productivity framing. |
| Choose game | 4 | Each game exposes player count and a direct setup path; group-fit guidance remains light. |
| Seat players | 4 | Local seats and capacity-bounded remote Bank/Slanguage tables are implemented; Bank join and reconnect are proven across two simulator accounts. |
| Know next action | 4 | Setup, lobby, table, turn, and unavailable-invite states keep the immediate action explicit. |
| Complete shared game | 3 | Local game families and server-authoritative remote commands are implemented; two-way Bank moves are simulator-proven, but a full remote finish on physical installs is still unproven. |
| Celebrate and replay | 3 | Local celebrations and same-group remote rematch exist and are covered by lifecycle tests; the full remote finish-to-rematch path still needs device proof. |
| Preserve continuity | 3 | Saved players, authoritative room reload, active-table reconnect, and same-group rematch exist; background and signed-device continuity remain open. |

## Remaining gap

Prove the complete host-and-guest path on signed physical installs: nearby or
link discovery, join, interruption, reconnect, finish, rematch, backgrounding,
and expiry. Keep link transport and room membership capability-owned; neither a
Friendship nor Household relationship should grant a seat.

## Success condition

Maya can open Games from Kwilt, seat nearby players, finish a fair Bank or Farkle game, and replay without signing in again or navigating through productivity surfaces.

## Evidence

- Source, focused tests, and a current native Simulator build prove the unified
  catalog, local surfaces, join states, and remote lifecycle contracts.
- Two isolated simulator accounts proved Bank discovery, join, active-table
  reconnect, start, and live moves in both directions against deployed Supabase.
- This evidence does not substitute for the signed two-device success condition.
