---
id: brief-guest-meal-plan-feedback
title: Guest Meal Plan Feedback
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-invite-the-right-people-in, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
related_briefs: [live-family-meal-board]
owner: andrew
last_updated: 2026-08-12
---

# Guest Meal Plan Feedback

## Frame

Maya sometimes needs input from someone who is not yet—and may never become—a
Kwilt Household member. The job is to quickly identify which proposed meals
work and name one missing option. It is not an onboarding or
Household-membership job.

## Learning release

The Plan share action creates a purpose-limited bearer link that expires after
seven days by default, can be revoked by the organizer, and snapshots only the
meal candidate title and image. The hosted mobile page looks and reads like the
Plan itself. It opens directly on one concrete task: choose every meal you would
eat, with a secondary option to suggest one missing meal.

The guest may add a display name, but it is explicitly an unverified label. A
browser-local opaque key lets the same browser revise its response. The link
never exposes the Household roster, grants membership, finalizes a Plan, edits
Plan candidates, or presents contact-card identity as verified.

Guest choices join the existing positive-support count on each regular Plan
row. The supporter list may show the optional label as `<name> · Guest`; that
label is explicitly unverified. A compact organizer receipt preserves a guest's
free-text suggestion, because it has no existing Plan row yet. Existing
Household participation remains the higher-trust signed-in path.

## UI contract

- **Three-second read:** whose Plan this is and `Which meals would you eat?`
- **Primary action:** `Send my choices` after at least one choice or suggestion.
- **Reveal later:** `Suggest a meal`, optional guest name, and expiry/privacy.
- **Visual hierarchy:** compact Plan-like rows on white; Kwilt mark in the
  standard page header; no intro card, people imagery, or app pitch before the
  task.
- **Post-submit receipt:** confirm what was sent, then offer `Get Kwilt free` as
  an optional way to keep ideas, family input, and groceries together.
- **Privacy copy:** link possession grants temporary response access only; guest
  identity is not verified; choices are private from other guests.

## Evidence gates

- Migration contract proves hashed tokens, closed tables, bounded RPC grants,
  expiry, revocation, response limits, and a bounded preview projection.
- Hosted boundary tests reject extra private fields and normalize only the
  intended response shape.
- App tests prove the Share Plan guide creates a guest-feedback invitation, not
  a Household caregiver invitation.
- App and migration tests prove guest choices are projected into the regular
  Plan support count and suggestions remain available to the organizer.
- Site tests prove the task precedes any app invitation and the install CTA is
  confined to the successful submission receipt.
- Signed-device and deployed-link proof remain required before promotion.

## Learning questions

- Do recipients understand that they are helping with one Plan, not joining a
  Household?
- Is an optional name enough context for the organizer without requiring login?
- Do guests choose existing meals, suggest a missing meal, or do both—and does
  that input change what the organizer sends to Groceries?

## Spec refinement

- Guest choices are informational positive support. An unverified guest cannot
  trigger the signed-in hard-pass grocery acknowledgement gate.
- A guest can select any number of the bounded candidate snapshot, not rank a
  long list or learn a new reaction vocabulary.
- Suggesting a meal does not silently add or schedule it. The organizer sees the
  suggestion and decides whether to add it to the Plan.
- Web participation remains complete without installing Kwilt. Installation is
  offered only after a successful response and promises additional ongoing
  planning benefits, not access to the task just completed.
