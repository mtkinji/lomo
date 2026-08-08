---
id: brief-stitch-five-game
title: Stitch Five Dice Game
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-help-us-enjoy-being-together
job_flow: job-flow-maya-start-playing-together
serves: [jtbd-help-us-enjoy-being-together]
related_briefs: [brief-kwilt-games-capability-integration, brief-kwilt-2-games-maturity]
owner: andrew
last_updated: 2026-08-07
---

# Stitch Five Dice Game

## Context

Kwilt Games has lively press-your-luck and conversation-led choices but no calm construction game. The user wants a deliberately familiar five-dice scorecard game whose quilt treatment makes play clearer and completion more satisfying. Novel mechanics are not a goal unless comparative playtesting proves a genuine playability improvement.

## Target audience

Aspirational family organizers want to turn a small opening into play without accounts, administration, or rules setup.

## Representative persona

Maya has two to four people nearby and a phone available. She wants a game everyone can understand quickly and finish without appointing a scorekeeper.

## Aspirational design challenge

How might we help Maya's group turn a short opening into a calm, familiar dice game that produces a quilt they visibly made, while preserving guest-first play and an immediate next action?

## Hero JTBD

`jtbd-help-us-enjoy-being-together` — connection is the demand spine; the finished quilt gives the group a satisfying reason to complete and remember the game.

## Job flow step

The brief serves choose a game, know the next action, complete shared play, and celebrate/replay in `job-flow-maya-start-playing-together`. Current delivery is already 3–4; this learning release tests whether a calm construction game expands group fit without increasing setup or coaching.

## JTBD framing

When a few of us have an unstructured pocket of time, we want a familiar dice game we can begin immediately and shape together, so the finished play feels like something we made rather than another score we accumulated.

## Design

Stitch Five is a local two-to-four-player five-dice game. Each stitch permits up to three rolls. Players pin dice between rolls and commit one unused category after any roll. The thirteen-category scoring contract, 63-point face-region threshold, 35-point Seam Bonus, and final highest-score outcome follow the familiar rules exactly.

The active player's quilt board is the only scorecard. Open patches show literal category names. After a roll, each open patch previews the exact score it would commit. Filled patches become distinct fabric tiles with score and category remaining readable without color. The active player's total and Seam Bonus state stay visible; other players' totals are quiet context.

Setup reuses the Games optional-name and saved-player surface. The game is guest-first and local-only. A result surface shows winners or ties, every final total, a completed quilt, native text sharing, and rematch.

“Stitch Five” replaces the conflicted Patchwork working title. The name describes the core action and five-dice format without borrowing the identity of the established quilt-building tabletop game. The catalog entry remains learning-gated under Workshop until observed table sessions meet the release threshold and a formal naming clearance is complete.

## Acceptance criteria

- Two to four local seats can begin without accounts or required names.
- Pure tested logic implements all thirteen categories, Seam Bonus, pinning, three-roll limit, player rotation, game finish, total calculation, and ties.
- Pin state is communicated by position/text/accessibility state as well as color.
- Every unused category shows a deterministic preview after a roll, including zero.
- A player can commit exactly one unused category after at least one roll.
- The board fills visibly and the game finishes after every player has thirteen scores.
- Results support native text sharing and rematch without persisting or publishing data.
- The route is registered for deep linking and navigation restoration.
- The entry is visible only in Workshop/development learning-release conditions.

## Reduction and exclusions

No new scoring mechanics, spatial placement, variants, AI choices, tutorial carousel, solo daily mode, remote table, saved game, public leaderboard, notification, image capture dependency, or production-ready naming claim.

## Release and learning

The first channel is a local build. Two observed table sessions must test time to first roll, coaching, score disputes, completion, rematch/share desire, and naming confusion. Promotion requires a distinct name plus both sessions finishing without coaching or scoring disputes.

## Spec refinement

The familiar rules are the authority where thematic vocabulary could create ambiguity. “Full Quilt” names five matching dice inside the board, while “finished quilt” describes a completed scorecard in result copy. Sharing is explicitly a compact text rendering in this slice; image export is deferred. A legal or trademark conclusion is outside this brief—the existing same-name product is treated as a practical naming and discoverability conflict.

## Success signal

Two first-time local players begin without coaching, finish with no scoring dispute, and voluntarily choose rematch or share.

## Open questions

- What distinct production name should replace the working title?
- Does observed duration justify a later short-board variant?
