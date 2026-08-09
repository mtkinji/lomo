---
id: brief-progressive-meal-commitment
title: Progressive meal commitment
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [shared-meal-cart, household-food-loop]
owner: andrew
last_updated: 2026-08-08
---

# Progressive meal commitment

## Context

The shared cart makes family contribution easy, but settling it currently
produces unnamed, undated records and leaves the boundary between ideas, the
committed plan, and Groceries unclear. A useful plan must answer the timing
questions that matter without asking a household to maintain a complete weekly
calendar.

## Target audience

This serves aspirational family organizers who need ordinary food decisions to
move with less coordination, not a new planning methodology.

## Representative persona

Maya has gathered useful family input and now needs to make the final call. Some
meals have a real occasion, some cover a repeated need, and others can remain
open until the household decides in the moment.

## Aspirational design challenge

How might we help Maya turn selected ideas into a shop-ready, understandable
food rhythm while preserving the fast shared cart and avoiding a weekly
calendar maintenance job?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` is the demand spine: the product should
move a few consequential food choices into shared action rather than reward a
more complete planning artifact.

## Job flow step

In `job-flow-maya-feed-household-with-less-work`, **Choose the planning
horizon** and **Make the final call** are both currently `2/5`. Kwilt stores
horizons and dated occasions, but the shared-cart path does not make either
legible and does not naturally carry unselected ideas into the next cycle.

## JTBD framing

When a few upcoming eating moments need coordination, Maya wants to commit the
meals that matter, place only the timing that is genuinely known, and give the
household one calm answer to “what are we eating?” Groceries must consume that
committed version without silently treating open cart ideas as decisions.

## Design

One continuously editable shared cart feeds one active committed **Next meals**
batch. During settlement, every selected meal begins as **Flexible**. Maya may
leave it that way, assign one specific date and meal period, or make it part of
a bounded coverage commitment over explicit dates.

The settlement flow stays inside the full Plan drawer:

1. **Choose next meals** reveals explicit selection; reactions never preselect.
2. **Continue** reveals optional placement with the prompt “Place any meals
   whose timing matters.”
3. Each meal offers **Flexible**, **One day**, or **Several days**. One day
   records a date and Breakfast, Lunch, Dinner, or Snack. Several days records
   explicit dates, a meal period, and a short coverage label.
4. **Use these meals** commits one immutable plan version. Selected meals leave
   the cart and unselected candidates, contributors, and reactions carry into a
   new draft cart.

Next meals is sparse and decision-led: chronological dated occasions first,
then bounded coverage, then Flexible. It never renders empty calendar cells.
Groceries compiles only from the committed version. A later revision makes any
reviewed Grocery list stale and requires a reviewable update.

The durable top-right affordance remains **Plan** across the lifecycle, using
the familiar meal icon and a counter for all meal items recoverable inside it.
Opening it leads with a plainly spaced list of committed Recipes, including
timing, diners, and servings when known, plus the Grocery action warranted by
the current plan/list versions. Any new shared ideas follow as a separate
section. This gives the settled plan useful presence without forcing flexible
meals onto dates or inventing another plan state.

Coverage dates are materialized within the current commitment; they are not a
timeless recurrence rule. In the first release, each recipe dish's existing
serving quantity is its total contribution to Groceries. Plain-food coverage
and per-occurrence quantities remain follow-on work and must never invent
quantities.

## Success signal

In an observed household flow, Maya can add and choose meals without scheduling
them, optionally answer a question such as “Sunday dinner” or “weekday
lunches,” settle once, and then both household members can distinguish cart
ideas from the committed plan and compile the correct Grocery version.

## Open questions

- Lightweight cooked, skipped, and carry-forward resolution is intentionally
  deferred until the settlement and Grocery handoff are proven.
- The recipe-stack widget is pinned as the next exploration after this step; it
  must consume committed Next meals rather than create a second plan authority.
