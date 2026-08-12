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
Kwilt Household member. The job is to review a meal shortlist, privately choose
up to three, pass, or suggest one alternative. It is not an onboarding or
Household-membership job.

## Learning release

The Plan share action creates a purpose-limited bearer link that expires after
seven days by default, can be revoked by the organizer, and snapshots only the
meal candidate title and image. The hosted white mobile page carries the same
calm voting vocabulary as Kwilt: pick up to three, pass, or suggest one.

The guest may add a display name, but it is explicitly an unverified label. A
browser-local opaque key lets the same browser revise its response. The link
never exposes the Household roster, grants membership, finalizes a Plan, edits
Plan candidates, or presents contact-card identity as verified.

The organizer can see response count, guest labels, pick/pass/suggestion state,
expiry, and can turn off an active link. Existing Household participation stays
in the same Share Plan guide and remains the higher-trust signed-in path.

## UI contract

- **Three-second read:** who asked, the meal options, and “pick up to three.”
- **Primary action:** `Send my feedback` after a pick, pass, or suggestion.
- **Reveal later:** optional guest name and expiry explanation.
- **Visual hierarchy:** food-first image cards on white; Kwilt mark in the
  standard page header; no parchment, people imagery, or disguised raw link.
- **Privacy copy:** link possession grants temporary response access only; guest
  identity is not verified; choices are private from other guests.

## Evidence gates

- Migration contract proves hashed tokens, closed tables, bounded RPC grants,
  expiry, revocation, response limits, and a bounded preview projection.
- Hosted boundary tests reject extra private fields and normalize only the
  intended response shape.
- App tests prove the Share Plan guide creates a guest-feedback invitation, not
  a Household caregiver invitation.
- Signed-device and deployed-link proof remain required before promotion.

## Learning questions

- Do recipients understand that they are helping with one Plan, not joining a
  Household?
- Is an optional name enough context for the organizer without requiring login?
- Do guests use meal picks, suggestions, or pass—and does the input change what
  the organizer sends to Groceries?
