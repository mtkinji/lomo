---
id: brief-live-family-meal-board
title: Collaborative Household Recipe Plan
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [household-food-loop, shared-meal-cart, progressive-meal-commitment]
owner: andrew
last_updated: 2026-08-11
---

# Collaborative Household Recipe Plan

## Context

The Recipes library already has a contextual Plan drawer, household additions,
and positive reactions. Its settlement model still treats those ideas as a
bounded round that must be finalized before Groceries can act. Households need
the same surface to remain useful whether they decide daily, every few days,
weekly, irregularly, or alone.

## Target audience

`audience-aspirational-family-organizers`: households that want ordinary food
decisions to move with less coordination without adopting a calendar or weekly
planning methodology.

## Representative persona

Maya wants everyone to contribute casually while adults retain authority for
shopping and resolution. She needs consensus to be visible without becoming a
poll administrator or maintaining parallel personal and family lists.

## Aspirational design challenge

How might we help Maya's household keep one living shortlist of recipes, turn
any subset into trustworthy grocery requirements, and return to what is ready
to cook, while preserving flexible timing, clear adult authority, reversible
decisions, and truthful purchase evidence?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — move the household from “what sounds
good?” to food it can actually shop for and make.

## Job flow step

`job-flow-maya-feed-household-with-less-work`: improves gathering input,
choosing what to shop for, compiling one correct list, recovering from changed
plans, and returning to recipes after shopping. These steps currently score
`2/5` because Plan, finalization, and Groceries compete as workflow centers.

## JTBD framing

When the household is considering what to make next, help everyone contribute
and express support in one private Plan, so an adult can shop for any chosen
subset and the household can see what is actually ready without dates,
planning periods, or duplicated lists.

## Design

Recipes remains the library. `Plan · N` remains its upper-right entry point and
opens the existing drawer. `N` is the number of active recipe occurrences.

The Plan is one household-scoped, persistent, open-horizon object. Adding a
recipe creates an **Idea** and implicitly records the contributor's +1. Other
eligible members can add or remove their own +1 through a compact reaction on
the row's second line. Contributor and supporter identity is available from
the reaction control, not permanent provenance copy.

Adults can enter contextual selection mode and **Send to Groceries** for one,
some, or all Ideas. Sent recipes remain in Plan and appear above Ideas. Each
ingredient is stored as a recipe-candidate contribution with its scaled
quantity, unit, optionality, and immutable recipe source. Compatible
contributions aggregate into one grocery item without losing the recipe-level
parts.

Plan presentation is derived into three groups:

1. **Ready to cook** — all required grocery contributions are `purchased` or
   `already_have`.
2. **Sent to groceries** — at least one required contribution remains needed;
   compact metadata may say `Missing N items`.
3. **Ideas** — nominated but not yet sent.

Readiness is not manually assigned. `skipped`, retailer cart acknowledgement,
or opening a retailer does not satisfy a requirement. Manual grocery
completion and future authoritative purchase/fulfillment evidence use the same
item state and readiness calculation.

Removing an Idea records a **Removed** outcome. Removing a sent recipe normally
rebuilds the grocery list without its unpurchased contributions; shared items
retain contributions from other recipes. The first consequential removal uses
an alert that offers **Keep grocery items** or **Remove recipe + groceries**.
Keeping converts the remaining recipe requirements into manual grocery work.
Purchased items and historical list revisions are never unwound.

**Made** records an explicit terminal outcome, removes the occurrence from the
active count, preserves reactions and timestamps, and never reverses grocery
purchases. It may later link to Cook Session evidence but does not require Cook
Mode.

Active ordering is group first, then support count descending, then most
recently added. Counts update immediately while physical resorting is deferred
until drawer open, refresh, or a lifecycle transition so the tapped row does
not jump.

Eligible members can view, add, and react. Existing owner/caregiver roles can
send, remove, and mark Made. Child access continues to require Meal Planning
capability activation. The same interactions remain natural for a one-person
household.

The first truthful transition to Ready can orient the user toward the existing
Plan control and offer **View Plan**. Kroger cart acknowledgement is not order
or fulfillment proof and must never trigger this education or readiness.

There is no required date, cadence, target count, lock, publish step, weekly
reset, planning deadline, negative vote, winner, or second personal Plan.

## UI contract

- **Job:** When recipes are under consideration or have been shopped for, see
  what the household wants and what can be made next.
- **Authority chain:** explicit product contract → iOS/accessibility → Kwilt UI
  Constitution and tokens → Candidate Inventory/list and BottomDrawer patterns
  → RNR component anatomy.
- **Three-second read:** Ready to cook, Sent to groceries, Ideas.
- **Primary action:** contextual `Send to Groceries` when Ideas exist and the
  viewer is an adult.
- **Primary information:** recipe title, lifecycle group, household support,
  missing requirement count.
- **Secondary information:** people behind reactions and low-frequency actions.
- **Reveal later:** selection controls, contributor names, Remove consequence.
- **Scan order:** Plan count → Ready → Sent → Ideas → contextual action.
- **Must not add:** calendar periods, workflow stepper, permanent checkboxes,
  verbose provenance, or a second Plan destination.
- **Reuse map:** `BottomDrawer`, `BottomDrawerHeader`, `Button`, `DropdownMenu`,
  `AlertDialog`, `OverlappingAvatarStack`, `Coachmark`, Recipe artwork.
- **Nearest precedent:** Candidate Inventory/list composition localized inside
  the existing Plan drawer; unlike a general inventory, lifecycle grouping
  owns the hierarchy and creation remains in Recipes.
- **External exemplar ledger:** Slack reactions only — preserve compact social
  feedback; translate into Kwilt avatars/tokens; reject Slack chrome, channels,
  emoji catalogue, and message layout.

## Success signal

A household can use the same Plan casually for several weeks, send changing
subsets to Groceries, remove one recipe without corrupting shared quantities,
and return to recipes that are actually ready without once managing a planning
period. A single user completes the identical add → send → satisfy → Made loop
without collaboration copy feeling required.

## Open questions

None block this build. Automatic Kroger fulfillment remains gated on a future
provider-authoritative order/receipt contract; cart acknowledgement is
explicitly insufficient.
