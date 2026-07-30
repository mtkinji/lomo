# Evaluate Learning: Simple Family Screen Time Administration

## Learning questions

1. Can a caregiver understand and activate the starter agreement without reading explanatory copy?
2. Does the agreement card contain enough information for ordinary administration?
3. Do caregivers naturally ask Chat to inspect, change, or make exceptions to Screen Time?
4. Does one compact Chat proposal preserve trust for consequential child-device changes?
5. Can users distinguish “saved” from “applied on the child device” without system jargon?
6. Does the schedule-only rule remove enough recurring requests to justify shipping before responsibilities?

## Supporting evidence

- Setup completion without backtracking or abandoned steps.
- Correct caregiver explanation of the rule and current child message.
- Successful native/Chat parity checks for the same typed change.
- Fewer manual unlock requests during a seven-day family test.
- Chat requests that use direct family language rather than product terminology.
- Recovery from offline/stale/failed delivery through the single offered action.

## Disconfirming evidence

- Caregivers repeatedly open diagnostics or ask what status labels mean.
- Chat proposals need paragraphs to explain their consequence.
- Users believe a saved proposal already changed the child device.
- Most families immediately require multiple rules or responsibility criteria.
- Native and Chat edits produce different policy state or copy.

## Instrumentation

Track:

- `family_screen_time_setup_started`, `step_completed`, `activated`;
- `family_screen_time_agreement_viewed`, `edited`, `deactivated`;
- `family_screen_time_chat_read`, `proposal_created`, `proposal_confirmed`, `proposal_declined`;
- `family_screen_time_native_handoff_opened`, `completed`, `abandoned`;
- `family_screen_time_policy_saved`, `device_applied`, `device_failed`, `recovery_opened`;
- exception requested, approved, denied, applied, and expired.

Do not track readable app identities derived from Apple tokens, content, browsing, messages, location, or a child behavior score.

## Decision rule

Proceed to the permanent single-rule product when the caregiver can complete and explain the flow, native and Chat outcomes remain equivalent, device delivery is reliable, and routine unlock requests decline during a seven-day signed-device test.

Simplify again if comprehension requires helper text or proposal review feels heavy. Add responsibility criteria only if schedule-only access fails to remove enough requests. Do not add multiple rules or templates until the single-rule path is dependable.

## Local implementation evidence — 2026-07-30

- Runtime owner: `/Users/andrewwatanabe/Kwilt`, branch `codex/family-screen-time-learning-slice`, commit `40ed1ca`, with the documented mixed working tree.
- Development server: Expo dev client on port 8081, process working directory `/Users/andrewwatanabe/Kwilt`.
- Installed shell: Kwilt bundle version 97 on the iPhone 17 Pro Simulator running iOS 26.5.
- Observed Household vocabulary: Charlie's Screen Time is **Set up** and routes to the child-owned screen.
- Observed applied state: one compact Games agreement, `Weekdays, 4–7 PM · 30 min/day`, one child-facing explanation, and one **Edit** action.
- Observed edit path: changed the start to 5 PM and the limit to 45 minutes, saved, received the simulated receipt, and returned to `Weekdays, 5–7 PM · 45 min/day` with the updated child explanation.
- Automated proof covers the initial device-needed state, exact Developer Tools handoff, ready-to-activate state, applying state, failure copy, persistence logic, setup ordering, privacy-bounded analytics, and status vocabulary.

The initial setup screen was not freshly observed in this Simulator pass because Charlie already had persisted applied state. Simulator proof does not cover Apple guardian authorization, the Family Activity Picker on the child device, cross-device delivery, background enforcement, shields, offline expiry, exception delivery, or release cleanup. Those still require a signed caregiver/child TestFlight build.
