---
id: brief-personal-meal-favorites
title: Personal meal favorites
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]
related_briefs: [household-food-loop]
owner: andrew
last_updated: 2026-08-06
---

# Personal meal favorites

## Context

Meals now supports direct addition to a durable shared Meal Plan. People also need a lighter, personal way to remember appealing meals without implying that the household has agreed to eat them.

## Target audience

`audience-aspirational-family-organizers` wants family food choices to become easier over time without maintaining a complex recipe-management system.

## Representative persona

Maya is browsing meals between other responsibilities. She wants to preserve a promising option in one tap and find it again when the next planning moment arrives.

## Aspirational design challenge

How might we let Maya quietly remember meals she personally wants to find again while browsing, without confusing private preference with the shared family Meal Plan or adding another management surface?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — remembering a useful meal reduces repeated search and helps the next food cycle move toward a realistic choice.

## Job flow step

In `job-flow-maya-feed-household-with-less-work`, this improves the transition from collecting food worth keeping to recognizing what fits and beginning again with less work. The current experience can display meals but has no durable lightweight personal recall signal.

## JTBD framing

When I see a meal I may want again, help me remember and retrieve it in one tap, so the next plan starts with less repeated searching. Keep the choice private, reversible, and distinct from the shared Meal Plan.

## Design

- Every meal card has a 36-point heart in the image's bottom-right corner.
- The default heart is an outline on Kwilt's existing frosted floating-control material; the selected state uses a filled charcoal heart.
- The existing plus/check stays top-right. Its meaning remains shared Meal Plan membership.
- Favorite state belongs to the signed-in person, persists in the backend, and is cached locally for offline recall.
- When favorites exist in the available meal inventory, Meals shows them in a first `Your favorites` shelf.
- No global Favorites destination, household voting semantics, or AI-ranking behavior is introduced.

## Success signal

A person can favorite a meal, leave and return, and retrieve it from `Your favorites` without mistaking that action for adding it to the shared Meal Plan.

## Open questions

- Whether a favorites-only filter becomes useful after the shelf has real usage.
- Whether personal favorites should become an explicitly authorized input to future meal suggestions.
