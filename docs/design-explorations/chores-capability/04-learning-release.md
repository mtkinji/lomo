# Learning Release: Activity-backed Chores

## Concept To Build

Build a quiet, child-legible Chores inventory where a child can inspect, take, and complete current household work while a simulated caregiver can optionally enable tokens and resolve review-required completions without leaving Chores.

## Capability Delta

Today, the user cannot:

- open Chores as a direct Kwilt capability;
- judge the accepted `For [member]` and `Household` inventory hierarchy in a real native bundle; or
- operate the claim and completion lifecycle from that inventory.

After this release, the user can:

- enable Chores in Kwilt Labs and open it from the capability menu;
- switch between a small set of simulated household members;
- see assigned and already-claimed occurrences under `For [member]`;
- take an available household occurrence and complete trusted work; and
- see pending-review and completed states without dashboard chrome.
- open a lightweight chore drawer for context without navigating away;
- experience a household with tokens fully on or fully absent; and
- switch to a simulated caregiver view to review one or several submitted chores.

Still intentionally not supported:

- real Household Mode security, member codes, or caregiver biometric re-entry;
- household-authorized backend reads or writes;
- projection into the production To-dos inventory;
- recurrence creation, production caregiver authentication, remote notifications, corrections history, token redemption, or Screen Time enforcement.

## User Experience

Chores is enabled from Settings > Kwilt Labs, then appears as a direct capability between the grouped product areas and Chats. The screen opens with `Chores`, a compact active-member control, one factual expectation line, `For [member]`, and `Household`.

Assigned and claimed rows use a direct completion control. Available household rows use one quiet `Take` action. Tapping any row opens a stateful detail drawer with a concise definition of done and the same current action. Taking a row moves that occurrence into `For [member]`; completing trusted work updates the same occurrence record.

Review-required work becomes `Waiting for approval`. In the simulated caregiver view, a Chores count badge and floating `BottomGuide` open a scroll-safe review drawer. One pending item opens directly; several open as a queue. Approval qualifies the original child/performance time, while `Needs another pass` returns the same occurrence with a short child-facing note.

The review detail is evidence-first: no `Done by` subtitle or explanatory approval copy. It shows the chore title, definition of done, an optional child-submitted photo, a compact avatar/name pill, and the two decisions. Children can add or change one optional photo from their chore detail. The photo is contextual evidence only; it never becomes mandatory or machine-judged.

Chore count remains visible in every household. Tokens are off by default and can be enabled only from the simulated caregiver's title-adjacent Chores settings. When off, token value and balance copy are absent rather than zeroed or disabled.

## Existing Product Relationship

The screen borrows Groceries' quiet inventory grammar and Kwilt's existing capability shell, header, button, drawer, typography, and token layers. The learning adapter uses explicit Activity occurrence identifiers so it can be replaced by the household-authorized Activity projection without changing the screen's interaction contract.

It does not alter ordinary personal To-dos, Household settings, Screen Time, the show-up streak, or production Activity sync.

## Buildable Slice

Must be real:

- Kwilt Labs activation and capability-menu navigation;
- persisted learning records with stable Activity occurrence identity;
- deterministic `Take`, `Release`, trusted completion, pending-review, approval, return-for-another-pass, progress, optional-token, and member/caregiver projection logic;
- native Chores inventory, member switcher, detail drawer, caregiver settings, approval guide, and one/many review drawer;
- focused domain, navigation, Labs, and screen tests;
- Simulator operation through the real capability menu.

Can be thin or temporary:

- two realistic simulated household members and starter occurrences;
- local-only persistence behind the Labs gate;
- member switching without member codes or Local Authentication.
- a local simulated caregiver actor and local notification badge instead of authenticated caregiver delivery or remote notification infrastructure.

Intentionally excluded:

- a second production task/completion database;
- caregiver authentication, household membership management, and background or remote notification delivery;
- generic reward catalog, rankings, penalties, streaks, or household dashboards;
- blind bulk approval, analytics beyond existing capability-shell events, or production migrations.

## Release Channel

`Local build`, gated behind Kwilt Labs. This is the safest channel for evaluating hierarchy, child comprehension, and interaction rhythm before household authority, canonical To-dos projection, and shared-device security are ready.

## Brand-Goodwill Guardrails

- The capability is opt-in and reversible.
- The screen presents a coherent inventory rather than exposed debug controls.
- No copy implies that simulated actions synced to a child account, changed Screen Time, or paid money.
- The ordinary To-dos experience remains unchanged.

## Reversibility

Turning off the Chores Lab hides the capability. The local learning record is isolated behind a versioned storage key and can be removed without migrating production Activity or Household data. The screen consumes a small adapter-shaped record so the simulated repository can be replaced by the canonical Activity occurrence projection.

## Permanent Product Threshold

Promote Chores beyond Labs only after the same interaction runs against household-authorized Activity occurrences, assigned and claimed work appears in the correct child's To-dos without duplication, Household Mode protects caregiver data, and signed-device/offline evidence proves performer attribution and reconciliation.
