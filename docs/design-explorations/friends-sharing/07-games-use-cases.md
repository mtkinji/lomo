# Games and Friends Use-Case Catalog

## Purpose

Games gives family and friends an easy reason to spend time together. Friends can remove recipient friction from remote play, but Games—not friendship—owns the session, seats, rules, turn state, results, and invitation lifecycle.

The governing contract is:

> A Friend is someone I can invite more easily. A game invitation is still a separate request to join one specific table.

This catalog is grounded in the accepted Games integration model: guest-first local play, saved local players, the complete game shelf, and private remote-room support for Bank, Pass the Pattern, and Slanguage. It does not add Games to the Goal-only Friends learning release.

## Horizons

- **Games foundation** — valid Games behavior that does not require Friends.
- **Friends expansion** — appropriate after both the Friends learning threshold and Games remote-session proof pass.
- **Later** — needs another Games-specific product and safety contract.
- **Not Friends** — Games or Household owns the behavior even when real-world friends participate.

## Start playing together

| Use case | Person's situation | Product behavior | Horizon |
| --- | --- | --- | --- |
| Start a local game immediately | Family or friends are already in the room | Open Games, choose a game, seat guest or saved local players, and begin without accounts | Games foundation |
| Hand one device around | Everyone is together and one phone is the table | Preserve private-turn handoff, clear current-player state, fair rules, and fast replay | Games foundation |
| Use a lightweight game utility | The group needs dice or another simple play aid | Open the utility without creating a social relationship or durable room | Games foundation |
| Join from a direct game link | Someone sent me a table invitation | Preview game, host, seat, and immediate next action before joining | Games foundation |
| Invite an existing Friend remotely | I know who I want at this table | Select the Friend as recipient, then send a separate Games invitation | Friends expansion |
| Invite someone who is not a Friend | I want to play once without creating a relationship | Preserve direct link/share-sheet invitation and guest-friendly join | Games foundation |
| Turn a local player into a Friend automatically | We played together on one device | Do not infer account identity or create a relationship from a local seat | Not Friends |

## Game and recipient selection

| Use case | Person's situation | Product behavior | Horizon |
| --- | --- | --- | --- |
| Choose a game suited to this group | We have a few people and a limited amount of time | Games explains player count, pace, setup, and play style honestly | Games foundation |
| Choose a remotely supported game | My Friend is not physically present | Clearly distinguish games that support remote rooms from local-only games | Games foundation |
| Reuse a known play partner | I often play with the same person | Existing Friends appear as optional recipients after I choose remote play | Friends expansion |
| Invite several Friends to open seats | The table needs multiple people | Create an independent seat invitation for each selected recipient | Friends expansion |
| Fill an open seat publicly | We need another player | No matchmaking, public rooms, or stranger discovery in this model | Not Friends |
| Recommend Friends based on behavior | Kwilt knows who plays often | Avoid social-graph inference; at most show my existing Friends or private recent recipients | Later |

## Invitation and consent

| Use case | Person's situation | Product behavior | Horizon |
| --- | --- | --- | --- |
| Preview before inviting | I want to know what I am asking someone to join | Show game, host, seat, play mode, expected participation, and expiration | Friends expansion |
| Preview before joining | I received an invitation and need context | Show inviter identity and table contract without exposing private state | Games foundation |
| Accept, decline, or defer | I may not want to play now | Provide calm, pressure-free decisions; joining is never implied by friendship | Games foundation |
| Handle an expired or full table | I opened the invite too late | Explain the authoritative state and offer a safe return to Games | Games foundation |
| Prevent invite replay | A one-use seat link was already accepted or revoked | Reject replay without creating duplicate seats or leaking table data | Games foundation |
| Invite from Chat | I say “ask Blaire to play Bank” | Chat may stage a Games-owned invitation preview, but cannot send or seat anyone without confirmation | Later |
| Auto-invite close Friends | We commonly play together | Rejected; closeness never becomes session consent | Not Friends |

## Session lifecycle

| Use case | Person's situation | Product behavior | Horizon |
| --- | --- | --- | --- |
| Join the intended seat | I accepted an invitation meant for me | Bind only my authenticated participant to that seat | Games foundation |
| Reconnect after interruption | My app closed or connection dropped | Return me to the same authoritative room and turn state | Games foundation |
| Continue asynchronously | We cannot finish in one sitting | Preserve turn state and resume contract only for games designed for it | Later |
| See active game invitations | I need to know whether someone is waiting on me | Games owns its pending and active table inventory; Sharing may link to it but must not duplicate state | Friends expansion |
| Leave a table but remain Friends | I am done with this session, not this person | End or vacate my Games participation without changing friendship | Friends expansion |
| End friendship during a game | The relationship changed while a table remains active | Preview the active session consequence; Games applies its safety policy independently | Friends expansion |
| Rematch with the same people | We finished and want another round | Create a new session from prior participants; each remote participant receives a fresh join decision unless still present at the table | Friends expansion |
| Maintain a permanent Friend game room | We play repeatedly | Defer until recurring-room permissions, absence, moderation, and lifecycle are explicit | Later |

## Play, fairness, and shared state

| Use case | Person's situation | Product behavior | Horizon |
| --- | --- | --- | --- |
| Know whose turn it is | The table must stay understandable | Games exposes the current player and allowed action from server-authoritative state | Games foundation |
| Trust randomness and scoring | A result affects whether play feels fair | Games owns deterministic rules, randomization boundaries, score calculation, and receipts | Games foundation |
| Protect private turn information | A game includes hidden prompts or choices | Reveal it only to the current seat and support safe device handoff | Games foundation |
| Observe a game without playing | A Friend wants to watch | Unsupported unless a later spectator role defines visibility and consent | Later |
| See every Friend's game activity | I wonder what people are playing | Rejected; friendship creates no Games feed, presence, or ambient session visibility | Not Friends |
| Compare Friends on leaderboards | We want competition over time | Rejected as a default Friends mechanic; any later comparison must be opt-in and game-specific | Later |

## Results, replay, and memory

| Use case | Person's situation | Product behavior | Horizon |
| --- | --- | --- | --- |
| Celebrate the completed table | We finished a game together | Show the table result and a replay choice to its participants | Games foundation |
| Preserve a personal best | I care about my own improvement | Keep Games-owned personal history without broadcasting it | Games foundation |
| Review games played with a Friend | I want to remember what we enjoyed | Show only sessions in which both people participated and only if Games retains that history | Later |
| Share a result deliberately | We want to send one outcome beyond the table | Create a previewable result artifact; do not publish automatically to Friends | Later |
| Offer a rematch | We had fun and want to play again | Address prior participants through a new session invitation, without engagement pressure | Friends expansion |
| Send losing, inactivity, or streak prompts | Kwilt wants players to return | Rejected; do not use relationship pressure or shame to drive play | Not Friends |

## Relationship and safety management

| Use case | Person's situation | Product behavior | Horizon |
| --- | --- | --- | --- |
| Block game invitations from someone | A person is repeatedly inviting me | A relationship block prevents new targeted Games invitations | Friends expansion |
| Block someone from one table | I need to leave this session safely without changing every relationship | Games removes or protects the participant under its table policy | Later |
| Report abusive table content | A user-generated prompt or behavior is unsafe | Games owns reporting evidence, moderation, and session response | Later |
| Hide blocker details | I was blocked and try another invitation | Return a safe unavailable result without identifying the blocker or table state | Friends expansion |
| Remove a Friend after play | I no longer want the reusable relationship | End friendship without rewriting completed Games history | Friends expansion |
| Let friendship bypass a game ban | We are connected, so restrictions should not apply | Rejected; safety restrictions override recipient convenience | Not Friends |

## Household, children, and mixed groups

| Use case | Person's situation | Product behavior | Horizon |
| --- | --- | --- | --- |
| Play locally with children | A family is together around one device | Guest/local seats require no child Friends graph or account relationship | Games foundation |
| Save a child's local player | The family wants quick repeat setup | Games may preserve a device-local player profile under its child-data contract | Games foundation |
| Activate Games for one child | A caregiver decides this capability is appropriate | Household owns child-by-child activation; Friends has no authority | Not Friends |
| Apply Screen Time rules to Games | A caregiver limits when a child may play | Screen Time and Household grants own enforcement | Not Friends |
| Invite a child to remote play | A known adult or peer wants the child at a remote table | Requires a separate child identity, guardian consent, invitation, safety, and moderation contract | Later |
| Let children add Friends | A child wants reusable peer relationships | Unsupported until age, guardian governance, blocking, reporting, discovery, and deletion are designed | Later |
| Play with extended family outside Household | Maya wants Grandma in one game but not Household | Use a Games invitation; an adult Friend relationship remains optional | Friends expansion |
| Mix Household members and Friends | A table includes family and outside peers | Each remote seat follows its own invitation and identity contract; Household membership grants no automatic seat | Friends expansion |

## Ownership boundaries

| Concern | Owner | Why |
| --- | --- | --- |
| Relationship exists and can receive invitations | Friends | Reusable mutual recipient reference |
| Game catalog and compatibility | Games | Determines what can be played and how |
| Room, session, seat, turn, rules, score, and result | Games | Authoritative play contract |
| Child capability activation and caregiver authority | Household | Family governance boundary |
| Device access schedule or restriction | Screen Time | OS-integrated enforcement boundary |
| Direct conversation between players | Future communication capability | Not implied by Friends or Games |
| Public matchmaking or discovery | Unsupported | Contradicts current private invite model |

## Core journeys

1. **Local instant play:** open Games -> choose game -> seat guest players -> play -> celebrate -> replay.
2. **Direct remote invite:** choose remote-supported game -> create table -> share specific seat link -> recipient previews -> accepts -> joins.
3. **Friend remote invite:** choose game -> choose existing Friend -> preview table invitation -> send -> Friend accepts -> joins only that table.
4. **Non-Friend becomes reusable:** complete or join one game -> optionally send separate Friend request -> recipient accepts -> use for a later game invitation.
5. **Reconnect:** return through app restart or deep link -> recover authoritative seat and turn state.
6. **Decline or expire:** recipient declines, defers, or arrives after expiration/full table -> no seat or friendship changes.
7. **End one layer:** leave game while remaining Friends, or end friendship while preserving the Games session according to its previewed safety policy.
8. **Mixed family table:** local Household members and invited adult Friends join through the correct local, Household, or remote-seat paths without authority crossing layers.

## Entry criteria for the Friends expansion

Games may use Friends as a recipient source only after:

1. The Goal-only Friends release proves zero-access friendship comprehension and safe two-account state transitions.
2. Games proves remote create, invite, join, reconnect, completion, and server convergence for its supported remote games.
3. A Games invitation previews game, host, seat, participation expectations, expiration, and session visibility before send and accept.
4. Leaving, ending friendship, and blocking have explicit effects on pending and active sessions.
5. No event instrumentation or UI exposes a Friend's game presence, history, score, or invitation state outside sessions the viewer participates in.

Until those conditions hold, Games keeps its direct invitation paths and Friends remains Goal-only.
