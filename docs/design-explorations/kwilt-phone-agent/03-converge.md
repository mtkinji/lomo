# Converge: kwilt-phone-agent

## Scoring against audience/persona and active JTBDs

| Alternative | `jtbd-trust-this-app-with-my-life` | `jtbd-capture-and-find-meaning` | `jtbd-carry-intentions-into-action` | Audience/persona fit | Design-challenge fit | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| A — SMS Follow-Through Upgrade | partial/strong | strong | strong | strong Marcus, partial Nina | partial | Good slice, too small for the revised phone-agent strategy. |
| B — Full Phone Front Door | strong | strong | strong | strong Nina and Marcus | strong | Best balance: honors the user's chosen full phone-number agent while keeping app governance. |
| C — Permissioned Agent Substrate First | strong | partial | partial | strong Nina, weak Marcus | partial/strong | Important implementation substrate, but not the user-facing wedge. |
| D — Household Keep Product | partial | strong | strong | strong household, weak Kwilt-native | weak/partial | Preserves old Keep, but forks product and data model too early. |
| E — Voice Operator First | partial | strong | partial | strong Nina, medium Marcus | partial | Differentiated but too much voice/trust risk for the first beta. |

## Chosen: Alternative B — Full Phone Front Door

Kwilt Keep should become **Kwilt Phone Agent**, the owned phone-number surface for Kwilt. The user can text or call. SMS proves the reliable follow-through loops: capture, receipt, right-time prompt, draft/help, and loop closure. Voice calls add high-bandwidth capture, recall, and planning, but app confirmation remains the boundary for risky writes.

This choice absorbs the old Keep wedge without letting it become a separate household-memory product. Relational follow-through remains the first emotionally obvious beta material, but the parent frame is broader: phone access to Kwilt's life system.

## Trade-offs accepted

- Accept higher technical complexity than SMS-only so the product direction includes calls from the start.
- Keep proactive outbound behavior SMS-first; no outbound voice calls in beta.
- Keep household/shared memory out of v1 even though the old Keep docs contain useful thinking there.
- Add Person/Memory/Event/Cadence primitives in v1 as internal support objects, but do not expose a People/CRM surface until beta evidence justifies it.
- Require app-canvas governance for permissions, confirmations, and audit instead of trying to make the phone thread explain everything.

## Trade-offs explicitly rejected

- Reject **SMS-only Text Coach** as the parent frame because it is now a slice, not the whole strategy.
- Reject **Permissioned Agent Substrate First** as the visible product because users need to feel the phone-number magic, not a permission framework.
- Reject **Household Keep Product** for v1 because it creates a second product boundary and high privacy complexity before proving one-user follow-through.
- Reject **Voice Operator First** because trust, transcript, cost, and latency risks are too high for the initial wedge.

## The bet

We're betting that **an owned phone number will make Kwilt feel available at the exact moment life happens**. Specifically: users will trust Kwilt more, and follow through more, when they can text or call one number to capture, recall, and carry forward meaningful intentions, while the app remains the place where permissions, confirmations, and audit live. If this is not true, we would narrow back to SMS-only Text Coach and keep voice as a later adapter.

## Success signal

Within 30 days of beta:

- At least 60% of beta users text or call Kwilt with one real intention within 7 days.
- At least 40% receive one right-time follow-up and reply with `done`, `snooze`, `pause`, or `not relevant`.
- At least 25% close one loop through phone input.
- At least 20% use phone recall at least once.
- Users describe the feature as "Kwilt helped me actually show up," not "Kwilt reminded me."
- STOP/opt-out stays below 5%, permission revokes after phone-agent actions stay below 10%, and data corrections stay below 2% of phone-agent writes.

## Documentation handoff

- Parent brief: `docs/feature-briefs/kwilt-phone-agent.md`.
- Child slice: `docs/feature-briefs/kwilt-text-coach.md`.
- Pull-based external surface: `docs/feature-briefs/external-ai-connector.md`.
- Cadence ritual: `docs/feature-briefs/background-agents-weekly-planning.md`.
- Original wedge evidence: `/Users/andrewwatanabe/kwilt_keep/docs/`.
