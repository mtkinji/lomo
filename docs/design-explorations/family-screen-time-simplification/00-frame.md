# Frame: Family Screen Time Simplification

## What the user said

> The capability direction is right, but the administration is difficult because it is too wordy and complex. Significantly simplify it, and make all of it controllable from Chat.

## Restated in user voice

When I set up or change Screen Time for my child, I want to state the family agreement once and know whether it reached the device, so ordinary access works without making me administer a control system. When it is faster to ask, I want to do the same job in Chat without losing review, authority, or delivery truth.

## Target audience

`audience-aspirational-family-organizers` — parents who want a family rhythm everyone can use without turning home life into administration.

## Representative personas

**Maya** is the primary persona. She wants predictable family access and fewer interruptions, but she is not a parental-control power user.

**Nina** is the supporting Chat persona. She expects ordinary language to reach a trustworthy native capability with inspectable proposals and receipts.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — the family agreement should help real responsibilities lead to predictable access without recurring negotiation.

## Job flow steps

- `job-flow-maya-move-family-life-forward`, step 6: let family members participate without turning life into admin; current score 2.
- `job-flow-maya-move-family-life-forward`, step 7: keep using the system because it feels helpful, not fussy; current score 3.
- `job-flow-nina-trust-ai-with-my-life-system`: let AI act proportionately, inspect what will change, approve it, and see an authoritative result; current implementation is evidence-gated at 4.

## Active anchors

- `jtbd-carry-intentions-into-action` — one understandable agreement should govern ordinary access.
- `jtbd-put-intention-before-impulse` — access follows the agreement rather than a reflexive unlock.
- `jtbd-trust-this-app-with-my-life` — caregiver authority, confirmation, and device delivery must stay truthful.
- `jtbd-stay-in-control-of-ai-actions` — Chat proposes consequential changes and never silently applies them.
- `jtbd-get-help-without-retelling-my-life` — Chat resolves the named child and current agreement from authorized Household context.

```yaml
serves: [jtbd-carry-intentions-into-action, jtbd-put-intention-before-impulse, jtbd-trust-this-app-with-my-life, jtbd-stay-in-control-of-ai-actions, jtbd-get-help-without-retelling-my-life]
```

## Friction we're addressing

The current learning screen repeats the agreement as an introduction, settings rows, a prose footer, a child preview, and several delivery caveats. It asks a parent to read internal distinctions instead of making one decision. Chat recognizes one narrow Screen Time command today, but correctly stops at an unavailable cross-device boundary.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Family Screen Time is owned by the named child inside Household; Settings only summarizes and routes.
- The accepted rule is one family agreement with target, schedule, optional responsibilities, and optional usage cap.
- Household authority, Apple authorization, commercial entitlement, desired policy, and device application are separate facts.
- Unified Chat already owns request routing, a canonical operation manifest, typed tool contracts, native handoffs, explicit proposals, and receipts.
- `screen_time.configure` already recognizes child/app/access intent but reports an honest not-yet-available boundary.

Constraints to preserve:

- One canonical family agreement and one policy source of truth.
- Child-by-child capability activation and caregiver-scoped authority.
- Native Apple authorization, app/category selection, and caregiver-authenticated release.
- No silent Chat writes, no prose-only success claims, and no claim of device application without the matching receipt.
- No surveillance dashboard, chores economy, arbitrary rule builder, or recurring unlock loop.

Constraints we may challenge:

- The learning screen does not need every system distinction visible at once.
- “Controllable from Chat” need not mean Apple-native steps occur inside a conversation; it means every job can begin and resume there with exact native handoff where required.
- The existing single `screen_time.configure` operation is too coarse for read, durable edit, exception, setup, and release truth.

## Aspirational design challenge

How might we let Maya establish and maintain one child-legible family agreement in seconds, from either Charlie's page or Chat, while preserving caregiver authority and honest device delivery?

## Out of scope

- General multi-rule automation, Android enforcement, usage surveillance, content inspection, or location.
- Chat auto-approval, Phone Agent Screen Time writes, and background AI policy changes.
- Replacing Apple's picker, Family Controls authorization, or native device-release confirmation.

## Open question

Can the schedule-only starter agreement remove enough routine requests before responsibility criteria ship? The release should measure this rather than expand the editor preemptively.
