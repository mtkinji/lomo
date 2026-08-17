---
id: brief-household-meal-count
title: Household Meal Count
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life, jtbd-invite-the-right-people-in]
related_briefs: [brief-household-food-loop]
owner: andrew
last_updated: 2026-08-17
---

# Household Meal Count

## Context

Meals currently treats the number of selected Household people as the usual
quantity. Andrew cooks for seven people, including a baby, but only Andrew and
Charlie exist in the current roster. The resulting `2 people` setting is false
and cannot be corrected without creating identities solely to satisfy a number.

## Target audience

`audience-aspirational-family-organizers` needs household defaults to reflect
ordinary life without requiring family-system administration first.

## Representative persona

Maya needs to cook enough for the people present while only some of them have
names or participation context in Kwilt. She wants the app to become more
helpful over time without blocking tonight's meal on setup.

## Aspirational design challenge

How might we help Maya set the real meal quantity immediately while preserving
optional person-specific context and keeping People management separate from
Meals?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — feeding the household with less mental
load requires a truthful starting quantity more than a complete roster.

## Job flow step

This improves step 3 of `job-flow-maya-feed-household-with-less-work`,
**Recognize whether it fits tonight — can I make enough?**, currently scored
1/5. The current offering exposes yield and scaling but derives quantity from
selected identities.

## JTBD framing

When I am planning food for the people actually in my home, let me set an honest
quantity now and add person-specific context only when it is useful, so Kwilt
helps without inventing household knowledge or making me finish a roster.

## Design

Add `usualDinerCount` as the numeric authority beside
`usualDinerPersonIds`. The drawer leads with an accessible 1–20 count stepper,
then shows existing people under `People (optional)`. Count must be at least the
number of selected IDs; selecting another person raises it when necessary, and
deselecting never lowers it.

Settings and Meal setup summaries display the numeric count. Recipes and Meal
Planning use it before selected-ID count and the existing fallback of four.
Food-need checks continue to use only selected IDs. Each saved dish keeps its
explicit servings and diners.

Persist count and IDs through the existing authority-preserving household meal
preferences command. Existing rows initialize from unique selected IDs, or four
when empty. Preserve current authorization, RLS, grants, and rollback behavior.

The existing Recipes overflow quantity control edits this same count when a
Household projection exists. It cannot remain a second profile-scoped source.

People records, contact import, birthdays, addresses, participation, gifting,
and affiliate commerce belong to a later Settings → People release. Meals
contains no People-management navigation or promotional copy.

## UI contract

- Job: set the usual starting quantity without completing the roster.
- Authority chain: explicit user decision → this brief → iOS/accessibility →
  Kwilt tokens and existing BottomDrawer/Button patterns.
- Three-second read: `7 people` is the main state.
- Primary action: Save.
- Primary information: count.
- Secondary information: selected People.
- Reveal later: People details in separate Settings → People.
- Scan order: title → count → optional people → Save.
- Must not add: setup progress, missing-person language, serving classes,
  Contacts, birthdays, addresses, gifts, affiliates, or green selected states.
- Reuse map: BottomDrawer, BottomDrawerHeader, Button, Icon, Typography, theme
  tokens, existing checkbox rows, and existing recipe quantity behavior.
- Nearest precedent: current UsualDinersDrawer plus RecipeSummaryBar's quantity
  control; retain drawer behavior, translate quantity hierarchy.
- External exemplar ledger: N/A.
- Required states: count minimum, count at selected-person boundary, optimistic
  save, failed save rollback, cached projection, persisted reload.
- Proof path: Settings → Meals → Usually cooking for on iPhone 17 Pro Simulator,
  then add/open a recipe or Meal Plan quantity surface.

## Success signal

Andrew saves `7 people` with Andrew and Charlie selected, reloads to the same
state, starts the next recipe/plan at seven, retains checks only for the two
named diners, and adjusts one dish without changing the shared default.

## Spec refinement

- The count is a people-count default, not a nutritional serving-class model.
- The supported range is 1–20 because downstream recipe logic already clamps
  to that range.
- Existing profile-scoped `defaultServings` remains only a compatibility
  fallback when no Household meal projection is available.
- This release does not create the separate People screen; that is a durable
  follow-up with its own identity/privacy design.
- Completion requires migration contract coverage, pure default-resolution
  tests, repository/cache/store tests, component behavior tests, changed-file
  verification, and real Simulator evidence.

## Open questions

None for this release.
