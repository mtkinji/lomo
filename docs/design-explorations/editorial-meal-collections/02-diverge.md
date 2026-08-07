# Diverge: Editorial Meal Collections

## Axis of variation

The alternatives vary by system center: static page, generic content platform,
or capability-owned editorial graph.

## A. Handcrafted Destinations

Each offer card opens a bespoke screen whose sections, copy, meals, and optional
plan action are coded together. Applying its plan passes a fixed list of recipe
references into the current Meal Planning draft flow.

- Persona fit: high for the first few polished experiences.
- Design-challenge answer: creates genuine editorial destinations quickly.
- System fit: reuses current screens and Meal Planning but gives every
  collection its own implementation.
- Best when: proving whether the editorial experience is desirable at all.
- Fails when: weekly rotation and dozens of collections create duplicated code,
  inconsistent claims, and fragile recipe references.
- Four-object and capture stance: introduces no new Kwilt planning object and
  never blocks recipe capture.
- Anti-pattern check: passes if placement stays bounded; long-term maintenance
  failure is likely.

## B. Universal Content Blocks

Build a generic remote content schema or CMS with hero, text, carousel, grid,
CTA, and scheduling blocks. Collections and ready-made plans are compositions
of those blocks; offer cards are campaigns targeting the same documents.

- Persona fit: medium; it can produce beautiful pages but optimizes authoring
  flexibility before proving user value.
- Design-challenge answer: supports many editorial formats and fast rotation.
- System fit: large extension that sits above capability boundaries and must
  re-encode plan authority inside generic actions.
- Best when: multiple Kwilt capabilities already need a shared editorial CMS.
- Fails when: a generic block can claim or mutate Meal Planning state without a
  capability-owned contract, or the Meals inventory begins to feel like ad
  inventory.
- Four-object and capture stance: neutral in theory, but generic actions risk
  bypassing domain ownership.
- Anti-pattern check: fails the reductive bar for the first release.

## C. Typed Editorial Graph And Editions

Recipes owns versioned `EditorialCollection` records; Meal Planning owns
versioned `MealPlanTemplate` records; a small Meals discovery manifest publishes
weekly `MealEditorialEdition` placements. Collection pages render from typed
sections. Reviewing a plan template produces a proposal, and explicit adoption
copies immutable recipe snapshots into a household-owned Meal Plan draft.

- Persona fit: very high; it supports inspiration, prepared relief, and family
  authority without configuration-first UX.
- Design-challenge answer: makes editorial discovery actionable while keeping
  claims and mutations inspectable.
- System fit: extends existing capability contracts instead of creating a new
  universal content owner.
- Best when: Kwilt expects both a durable editorial library and repeatable
  ready-made plan adoption.
- Fails when: the typed schema becomes so rigid that every story needs a new
  application release; storage and delivery should therefore remain replaceable.
- Four-object and capture stance: Collections and templates are capability
  reference records, not Arcs, Goals, Activities, or Chapters. Meal Planning
  continues to own the only household plan state. Recipe capture remains free.
- Anti-pattern check: passes; deterministic editions, no forced commitment, no
  anthropomorphic AI, and no default-public sharing.

## Direction

Advance **C**. Borrow A's deliberate handcrafted quality for the learning
release, but express that content through typed records. Defer B's generic CMS
until another proven capability needs the same authoring substrate.
