# Frame: Family Screen Time Direct Controls

## What the user said

> I want to say, “Turn off Brawl Stars for Charlie and Grant for the next three hours,” and I just want that to work.

## Restated in user voice

When family life changes in the moment, Maya wants to name the apps, children, and duration in ordinary language and trust Kwilt to carry out that bounded decision, so she can protect the moment without navigating repeated settings or creating a permanent rule.

## Target audience

`audience-aspirational-family-organizers` — people who want useful family coordination without becoming system administrators.

## Representative persona

Maya is handling a concrete moment affecting more than one child. She knows the outcome she wants and does not want to reconstruct it in a rule editor.

- Current situation: one or more apps should be unavailable now for one or more children.
- What she is trying to do: make one bounded family decision quickly and return to life.
- Tension: the action is consequential, but the administration should be tiny.
- What would feel wrong: a multi-screen form, unclear partial application, hidden monitoring, or a receipt that says “done” before the devices apply it.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — the control protects the family’s present intention.

## Job flow step

`job-flow-maya-move-family-life-forward`, step 7, **Let family members participate without turning life into admin**, is currently 2/5. Existing work establishes Household and a durable Screen Time agreement, but it does not yet support a direct bounded multi-child action.

## Active anchors

- `jtbd-carry-intentions-into-action` — one spoken intention becomes a time-bounded device policy.
- `jtbd-put-intention-before-impulse` — selected apps can wait during a family moment.
- `jtbd-stay-in-control-of-ai-actions` — Chat shows the exact children, selection, expiry, and consequence before applying.
- `jtbd-trust-this-app-with-my-life` — saved, delivered, applied, expired, and failed remain separate truth states.

```yaml
serves: [jtbd-carry-intentions-into-action, jtbd-put-intention-before-impulse, jtbd-stay-in-control-of-ai-actions, jtbd-trust-this-app-with-my-life]
```

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Chat already stages typed, consequential proposals and records receipts.
- Household already models child-scoped capability activation and caregiver authority.
- The Screen Time control plane already distinguishes desired policy from device application.
- Apple gives Kwilt opaque app/category tokens selected through `FamilyActivityPicker`; Apple does not expose a readable installed-app inventory to Chat.
- A picker on a caregiver device can show applications from authorized child devices in the Apple Family Sharing group.

Constraints to preserve:

- Apple selections stay opaque outside the native boundary.
- A caregiver-defined label such as **Brawl Stars** may identify a saved selection reference; it is not an installed-app inventory.
- Multi-child actions must be validated as a unit and report per-device application truth.
- A temporary block automatically expires and cannot silently become a permanent agreement.
- Safety and communication allowances and stricter external Apple restrictions still win.

Design implication:

Direct controls use one bounded override primitive with two actions: **block** and **allow**. A caregiver may create an override directly in Chat, or approve one after a child request; the enforcement record is the same and its provenance remains visible. Chat should resolve a saved child-specific selection by its caregiver-defined label. If a child lacks that saved selection, Chat hands off to the native picker once, then the same phrase works thereafter.

## Aspirational design challenge

How might we help Maya apply one clear, temporary app decision across the right children in a single conversation, while preserving explicit review, Apple privacy, automatic expiry, and truthful device receipts?

## Out of scope

- Discovering or reading every installed app from a child device.
- Remote uninstall, device lock, location, browsing, content, or usage surveillance.
- Claiming cross-device enforcement from Simulator or server-save evidence.

## Open question

Signed-device testing must determine whether one parent-picked token can safely address the same app on multiple authorized child devices; until then, selection references remain child-specific.
