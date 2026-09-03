---
title: Family Screen Time commercial boundary
audience: audience-aspirational-family-organizers
persona: Maya
hero_jtbd: jtbd-move-the-few-things-that-matter
serves:
  - jtbd-put-intention-before-impulse
  - jtbd-invite-the-right-people-in
  - jtbd-trust-this-app-with-my-life
status: exploring
last_updated: 2026-09-02
---

# Frame: Family Screen Time Commercial Boundary

## What the user said

Basic family enrollment feels like substantial value. Reconsider the Free/Pro
boundary so Kwilt does not give away the distinctive family product while also
avoiding a claim that Pro merely sells access to Apple's Screen Time APIs.

## Target audience and representative persona

`audience-aspirational-family-organizers`, represented by Maya. Maya wants a
child's phone to follow a clear agreement without making her a device
administrator or permanent unlock gatekeeper.

## Hero job and underserved step

Hero JTBD: `jtbd-move-the-few-things-that-matter`.

The primary job flow is
`job-flow-maya-establish-family-screen-time`, especially:

- step 2, connect the correct Kwilt child membership and caregiver authority;
- step 3, enroll the intended physical child device with Apple guardian
  authorization; and
- step 5, create the starter agreement and know when the device applied it.

These steps are currently scored 2, 1, and 1. The product does not yet prove an
end-to-end production enrollment or delivery flow, so the commercial boundary
is a design decision rather than a shipping fact.

## The key distinction

"Family enrollment" currently bundles two different products:

1. **Apple authorization bridge**: Apple Family Sharing approval, Screen Time
   authorization, privacy-preserving app selection, and device-local
   enforcement.
2. **Kwilt managed Household**: binding an authorized device to a named Kwilt
   dependent, caregiver roles, remote policy delivery, desired/applied proof,
   recovery, shared changes, requests, cross-domain conditions, and history.

Apple supplies the first set of primitives. Kwilt creates the second system.
The commercial boundary should distinguish them instead of treating every
family action as one paid capability.

## Anchor assessment

### `jtbd-put-intention-before-impulse` — strong alignment

A Free path must produce one honest, useful guardrail rather than stopping
after permissions. Otherwise the upgrade wall interrupts the job at the exact
moment the person expects Apple-backed behavior to begin.

### `jtbd-invite-the-right-people-in` — strong alignment

Named dependents, multiple caregiver authority, and remote household
coordination are distinctive Kwilt relationship value. They are not equivalent
to Apple's authorization prompt and do not need to be given away merely to
prove the Screen Time substrate works.

### `jtbd-trust-this-app-with-my-life` — strong alignment, with monetization risk

The boundary must be legible and reversible. Release, cleanup, disabling, and
reading existing agreements remain available regardless of subscription.
Pricing copy must describe the Household service rather than imply that payment
unlocks Apple's API.

## Constraint posture

`Bend the system`.

Keep the current Free personal baseline and the family control-plane
architecture, but split the overloaded family enrollment concept into a local
starter experience and a Kwilt-managed Household experience. Avoid rule-count,
app-count, or minutes-based gates because those resemble metering the Apple
capability itself.

## Aspirational design challenge

How might we let Maya complete one useful, in-person family Screen Time setup
without paying for Apple authorization, while reserving the enduring value of
named dependents, remote caregivers, cross-device reliability, and adaptive
family agreements for Kwilt Pro?

## Design constraints

- Free may not end at a permission or app-selection demo; it needs a useful
  enforced outcome.
- Pro should be differentiated by relationship topology, coordination,
  automation, and durable service—not by the raw number of Apple-selected apps,
  blocked minutes, or native schedules.
- Existing agreements stay readable, removable, and safely releasable after
  downgrade.
- A child must understand the rule and next action without surveillance or
  shaming.
- Apple authorization and Kwilt Household authority remain separate facts.
- Physical-device/TestFlight proof remains required before claiming enrollment,
  delivery, enforcement, or cleanup works.

## Promising framing hypothesis

Free is **one-device, in-person family protection**. Pro is **a managed family
system across people, devices, and Kwilt capabilities**.

That hypothesis deliberately does not yet decide the exact Free starter rule or
which Household boundary produces the cleanest customer promise. Those are the
next divergence questions.
