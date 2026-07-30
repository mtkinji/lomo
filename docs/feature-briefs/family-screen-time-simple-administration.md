---
id: brief-family-screen-time-simple-administration
title: Simple family Screen Time administration and Chat control
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-carry-intentions-into-action, jtbd-put-intention-before-impulse, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-family-screen-time-controls, brief-unified-chat]
owner: andrew
last_updated: 2026-07-30
---

# Simple Family Screen Time Administration And Chat Control

## Context

The family Screen Time direction is accepted, but the current caregiver learning screen repeats the same agreement and exposes setup, device, delivery, and proof language all at once. That administration burden contradicts the job. Unified Chat already recognizes a narrow child/app access request, but it correctly stops at an unavailable cross-device boundary. This brief simplifies the native flow and evolves Chat into a trustworthy alternate controller over the same capability.

## Target audience

Primary: aspirational family organizers. Maya wants predictable family access and fewer routine negotiations without becoming a parental-control administrator. Chat is an alternate interaction channel for this Household-owned job, not a separate audience or policy owner.

## Representative personas

Maya is setting up or revisiting Screen Time for Charlie. She wants the agreement, current state, and next action—not a systems explanation.

Nina asks Chat what Charlie can do, requests a change, and expects Kwilt to preserve caregiver authority, show the exact consequence, and distinguish saved policy from applied device state.

## Aspirational design challenge

How might we let Maya establish and maintain one child-legible family agreement in seconds, from either Charlie's page or Chat, while preserving caregiver authority and honest device delivery?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — one family agreement should turn ordinary expectations into predictable access without repeated intervention.

## Job flow step

This improves `job-flow-maya-move-family-life-forward`, especially step 6, “Let family members participate without turning life into admin” (score 2), and step 7, “Keep using the system because it feels helpful, not fussy” (score 3). Chat also inherits the trust contract from `job-flow-nina-trust-ai-with-my-life-system` for proportional action, inspectable change, confirmation, and receipts.

## JTBD framing

When I set up or change Screen Time for my child, I want to state the agreement once and know whether it reached the device, so ordinary access works without making me administer a control system. When it is faster to ask, I want to do the same job in Chat without losing review, authority, or delivery truth.

## Design

### UI contract

```markdown
Job: When a caregiver sets up or checks a child's Screen Time, they need to understand the current agreement and take the one required action, so routine access no longer needs negotiation.
Primary action: Continue setup, Turn on, Edit, or Fix device—exactly one for the current state.
Must show: child, target, compact schedule/limit, current child explanation, and actionable status.
Reveal later: detailed criteria, delivery history, Apple limitations, policy version, diagnostics, and release.
Must not add: dashboard, generic rule builder, persistent technical caveats, duplicate agreement prose, or Chat-owned policy state.
Reuse map: SettingsPage/SettingsGroup for setup steps; Button for the primary action; shared compact agreement card for native, proposal, and receipt presentation.
Behavior sources: family Screen Time brief, Screen Time control plane, Household authority, Unified Chat operation/proposal/receipt contract.
Unresolved decisions: none for the schedule-only learning release; responsibilities remain deferred.
Required states: not activated, device needed, picker needed, ready to activate, applying, applied, needs attention, deactivating, and released.
Proof path: Household > Charlie > Screen Time and Chat requests on the iPhone 17 Simulator; signed caregiver and child devices for Apple authorization and enforcement.
```

### Native caregiver experience

Charlie's page contains one Screen Time card.

- **Needs setup:** “Connect Charlie's iPhone to continue.” Primary action: **Continue setup**.
- **Ready:** Games; Weekdays, 4–7 PM; 30 min/day; one child preview. Primary action: **Turn on**.
- **On:** the compact agreement, today's child explanation, and **Edit**.
- **Needs attention:** one plain reason and one recovery action. Technical detail remains behind **Details**.

The progressive setup asks one question per step:

1. Connect Charlie's iPhone.
2. Choose apps in Apple's native picker.
3. Review the recommended School-day Games agreement.
4. Preview Charlie's current message.
5. Turn on and wait for the exact policy version to be applied.

The ordinary surface removes the hero introduction, Delivery row, repeated full-sentence footer, permanent Apple caveat, and expanded child-preview section. Development simulation lives in Developer Tools.

### Shared presentation model

Native cards, Chat proposals, and receipts use one capability-owned presentation model:

```ts
type FamilyScreenTimeAgreementSummary = {
  childMembershipId: string;
  childDisplayName: string;
  targetLabel: string;
  scheduleLabel: string;
  limitLabel: string | null;
  responsibilityLabel: string | null;
  childExplanation: string;
  lifecycle: 'needs_setup' | 'ready' | 'applying' | 'applied' | 'needs_attention' | 'releasing';
  nextAction: 'continue_setup' | 'activate' | 'edit' | 'recover' | 'none';
};
```

The presentation model consumes authoritative agreement and receipt state; it never becomes another policy record.

### Chat control

Unified Chat discovers family Screen Time only when authorized Household evidence is available. It resolves child display language to a typed membership id before proposing a change.

Canonical operations:

- `screen_time.read`
- `screen_time.agreement.create`
- `screen_time.agreement.update`
- `screen_time.agreement.deactivate`
- `screen_time.exception.create`
- `screen_time.device.setup.open`
- `screen_time.device.release.open`

Examples:

- “What are Charlie's Screen Time rules?” returns the compact agreement and current device state.
- “Let Charlie use Games from 4 to 7 on school days for 30 minutes” produces one proposal card.
- “Move Games to 5 PM” uses the current conversation referent only when the child and rule remain unambiguous and current.
- “Give Charlie 10 more minutes today” proposes a fixed bounded exception; it does not edit the rule.
- “Why can't Charlie play?” returns the current actionable reason and next transition without a surveillance report.
- “Set up Charlie's phone” stages a native handoff to the exact setup step.

### Authority and confirmation

- A child name is not authority. All mutations require an authorized caregiver membership with Screen Time scope for the resolved child.
- Reads may run without confirmation after request-scoped private context authorization.
- Agreement changes, deactivation, and exceptions require explicit proposal confirmation. Screen Time has no Chat auto-apply policy.
- Child-originated Chat cannot expose caregiver administration tools or mutate the agreement.
- Phone Agent Screen Time writes remain unavailable in this release.

### Desired and applied truth

A successful server mutation receipt means the desired agreement was saved. It does not mean the child device applied it.

Chat and native show:

1. **Agreement saved** — authoritative policy version accepted.
2. **Applying to Charlie's iPhone** — exact device receipt pending.
3. **Applied on Charlie's iPhone** — exact desired version acknowledged.

Deactivation remains **Releasing** until monitoring, shields, cached policy, and device binding are cleared and acknowledged. Stale proposals fail without partial application and refresh the current rule.

### Native-only boundaries

Chat can initiate and resume but cannot complete:

- Apple guardian authorization;
- Family Activity Picker app/category selection;
- permission prompts;
- caregiver-authenticated device release.

Each becomes a durable client action that opens the exact native step, records completion or failure, and returns the user to the same Chat thread.

### Analytics

Measure setup steps, agreement views/edits, Chat reads/proposals/decisions, native handoffs, policy saves, device receipts, exceptions, and recovery. Do not collect readable identities from Apple tokens, content history, browsing, messages, location, or child behavior scores.

## Success signal

A caregiver can set up, understand, and edit the one agreement without reading helper copy; can perform the same supported jobs through Chat; can correctly distinguish saved from device-applied state; and sees routine unlock requests decline during a seven-day family test.

## Release and proof

Local Simulator proof covers native/Chat comprehension, proposal behavior, handoff routing, desired/applied presentation, persistence, and stale-version handling. Signed physical devices and TestFlight remain mandatory for Apple authorization, picker, cross-device delivery, background enforcement, offline expiry, shield behavior, exceptions, and release cleanup.

## Spec refinement

- This work is split into a native simplification plan and a Chat/control-plane plan. The native slice can ship to local learning first; Chat mutations must not precede an authoritative child-scoped policy command.
- The current local learning store remains development scaffolding. It may power local UI parity tests but is not a server authority for Chat.
- The existing `screen_time.configure` operation is retired only when the new operation coverage and boundary tests are complete; until then it continues reporting the honest unavailable boundary.
- Responsibilities remain excluded until Household Activity assignment is authoritative.
- The first Chat exception durations are exactly 10 minutes or until the current window ends.
- No implementation step changes subscription packaging, global navigation, or sibling capability activation.

## Open questions

- After the schedule-only seven-day test, does the family need responsibility criteria before this becomes a compelling paid unit?
