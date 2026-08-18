---
id: brief-shared-household-device-profiles
title: Caregiver-anchored Household Mode
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-household-foundation, brief-chores-as-recurring-activities]
owner: andrew
last_updated: 2026-08-17
---

# Caregiver-anchored Household Mode

## Context

A family may share one iPad even when its children do not have personal devices or independent Kwilt accounts. The device needs to support real child participation without exposing the caregiver's private Kwilt, inventing a shared adult credential, or requiring full OAuth during ordinary family switching.

## Target audience

`audience-aspirational-family-organizers` wants family participation to feel immediate and calm rather than like administering a multi-user workspace.

## Representative persona

Maya has a trusted iPad in a common area of the home. Her children should be able to choose their name, enter a lightweight member code when required, and use Chores and other approved household capabilities. Maya should be able to return to her complete Kwilt only through fresh device authentication.

## Aspirational design challenge

How might we let Maya's family share one doorway into Kwilt while keeping child attribution, caregiver authority, and private personal data unmistakably separate?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` is the demand spine because the shared device matters only when family members can use it to participate in ordinary life.

## Job flow step

`job-flow-maya-move-family-life-forward` scores **Family participation** 3/5. Household and capability foundations exist, but a shared iPad cannot yet provide a bounded child session or protected return to the caregiver's account.

## JTBD framing

When the household shares an iPad, Maya wants each child to enter only the parts of Kwilt meant for them and have their actions attributed correctly, while her private account remains protected and easy for her to recover.

## Design

### Caregiver anchor

One individually assigned caregiver's real Kwilt account remains authenticated on the shared iPad. Household Mode is a restricted family-facing layer over that session. It is not a separate family account, a shared password, or a set of complete cached account sessions.

### Identity control

The switcher lists eligible dependent children and the assigned caregiver. The same active-member control appears in the capability menu and in capability headers where attribution matters, beginning with Chores.

- Selecting a child establishes that household member as the bounded actor and requests the child's member code when configured.
- Selecting another child changes the actor only after that child's required code succeeds.
- Selecting the caregiver invokes Face ID, Touch ID, or device-passcode authentication.
- Successful caregiver authentication exits Household Mode into the caregiver's complete Kwilt.
- Cancellation or failure retains the current child context.

Device authentication authorizes the transition to the assigned caregiver account; it does not identify which enrolled adult supplied the biometric or device passcode.

### Household capability set

The initial allowed set is Chores; the selected child's own Arcs, Goals, and To-dos; household-approved/shared Recipes; the shared Meal Plan; and the shared Groceries list. Every surface owns its safe child/household projection and allowed actions.

Chat, Chapters, Money, and all other capabilities remain excluded until separately designed and accepted for Household Mode.

### Privacy and lifecycle

- Child context covers every caregiver-only route and cached presentation before interaction.
- Household membership alone exposes no personal capability content.
- Backgrounding or sufficient inactivity returns the device to Household Mode before child interaction resumes.
- An authorized caregiver manages and resets child member codes under Household.
- Removing the shared-device designation invalidates child sessions and returns the app to ordinary caregiver use after authentication.
- Optional Apple Guided Access may keep the physical iPad inside Kwilt but is not part of Kwilt identity or authority.

### Implementation fit

Kwilt can generalize its existing local-authentication mechanism. Before doing so, the iOS Face ID permission explanation must be broadened from its current Money-only wording to truthfully describe protecting the caregiver's Kwilt account.

The production design must keep authenticated caregiver, assigned device, active child, Household membership, capability authority, performer, recorder, approver, and authorizer as separate facts.

## Success signal

On a designated family iPad, two children can switch into their own bounded Chores experiences, complete work with correct attribution, and never reach caregiver-only content. Selecting the caregiver requires fresh device authentication and reliably restores the caregiver's full Kwilt. Backgrounding or expiry safely covers that account again.

## Non-goals

- A family-owned master account or shared adult password.
- Full multi-account OAuth switching.
- Using biometrics to identify children.
- Exposing the caregiver's entire Kwilt through Household Mode.
- Treating Guided Access as household authentication.
- Authorizing under-13 production use without the separate child-data and parental-consent contract.

## Open questions

- Exact relock timeout and background behavior.
- Whether the neutral state remembers the last child.
- Whether member codes are optional household-wide or configurable per child.
- Whether the first Chores learning release uses the real lock or an internal simulation.

Full decision ledger: [Caregiver-anchored Household Mode](../design-explorations/shared-household-device-profiles/03-converge.md).
