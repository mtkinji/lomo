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
last_updated: 2026-08-22
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

One continuously editable set of Meal ideas feeds one active Grocery list. The
drawer leads with an unnamed, reaction-sorted set of ideas, followed by a flat
**Planned** section in the same scrolling list. Each organizer-movable row has a
persistent leading grab handle. A single **View groceries** action is docked
above the bottom safe area; there is no nested Grocery tray, row-level Add
button, selection mode, inventory status, or permanent Send button.

Dragging a meal into **Planned** atomically changes `idea` to `sent` and
recompiles the current Grocery list. Planned rows remain visible without item
counts or readiness metadata; those belong to Groceries. Dragging a committed
meal back into Meal ideas atomically restores
`idea`, removes only its unpurchased Grocery contribution, preserves purchased
history and shared contributions, and leaves the meal and its reactions in Plan.
Both directions have screen-reader actions, overflow alternatives, failure
recovery, and a short Undo receipt.

During later settlement, every Grocery-committed meal begins as **Flexible**.
Maya may leave it that way, assign one specific date and meal period, or make it
part of a bounded coverage commitment over explicit dates.

Next meals is sparse and decision-led: chronological dated occasions first,
then bounded coverage, then Flexible. It never renders empty calendar cells.
Groceries compiles only from the committed version. A later revision makes any
reviewed Grocery list stale and requires a reviewable update.

The durable top-right affordance is **Ideas**, using the familiar meal icon.
It shows a small red dot only when this recipient has unseen household Plan
activity; it is never a meal count. Opening it leads with the
reaction-sorted Meal ideas list and then Planned as a peer section. The grocery
cart icon appears only with the **View groceries** dock action. This gives the
settled plan useful presence without forcing flexible meals onto dates,
duplicating Grocery inventory, or inventing another plan state.

Household attention is inferred instead of manually addressed. Every eligible
member of a Household-attached Plan can already add meals and react at any
time. A new meal idea starts or extends one 30-minute quiet-period window.
After the burst settles, Kwilt marks the live Plan as unseen for each eligible
member who did not contribute, react during the window, or return after the
latest idea. That state appears as the same small red dot on **Recipes** in the
capability menu and **Ideas** inside Recipes. A normal push notification deep
links directly to this same live Plan; there is no inbox item, member picker,
choice round, or separate results destination. Push is a recipient-controlled
`Household meal planning` category. Turning it off removes the interruption but
does not suppress the in-app dot. Opening the live Plan clears the recipient's
unseen state. Reactions, Grocery compilation, lifecycle changes, and ordinary
row edits do not initiate attention in the learning release.

The top-right **Share** action remains exclusively for an expiring, revocable
guest link. A guest does not become a Household member and automatic Household
attention never sends the guest link.

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

## Spec refinement

- The grab handle owns the native pan gesture so row reactions and vertical
  scrolling remain independently operable.
- The first implementation supports one meal per drag. Bulk commitment stays
  out until observed use proves it necessary.
- The existing `ready` projection remains derived from acquired Grocery items;
  it is not rendered as inventory metadata in Meal ideas.
- Completion requires focused lifecycle/repository/component tests plus the real
  iPhone Simulator path. Source tests do not establish backend deployment,
  signed-device haptics, VoiceOver acceptance, TestFlight, or production proof.
- Automatic attention additionally requires the migration, scheduled Edge
  Function, recipient-owned unseen state, Expo push receipt, direct deep link,
  and two-account signed-device behavior to be proven separately. Source tests
  do not establish any of those live stages.
