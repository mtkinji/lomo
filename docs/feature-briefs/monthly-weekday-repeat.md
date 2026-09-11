---
id: brief-monthly-weekday-repeat
title: Monthly weekday repeat
status: accepted
audiences: [audience-burned-out-productivity-power-users, audience-faith-and-values-driven-builders]
personas: [Marcus, Sarah]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-move-the-few-things-that-matter]
related_briefs: []
owner: andrew
last_updated: 2026-09-09
---

## Context
Monthly repeats cannot express Andrew's third-Sunday responsibility.

## Target audience
People maintaining recurring commitments without repetitive planning, including faith- and values-driven builders.

## Representative persona
Marcus needs recurring commitments to stay reliable without maintaining another planning system. Sarah provides the concrete lesson-preparation example.

## Aspirational design challenge
Help Sarah keep a monthly commitment with one explicit repeat rule.

## Hero JTBD
`jtbd-move-the-few-things-that-matter`: make a meaningful commitment actionable without monthly calendar arithmetic.

## Job flow step
The existing Activities surface serves Marcus's move-the-few-things-that-matter flow. Monthly weekday recurrence closes a specific scheduling gap in carrying intentions into action. Sarah's capture ordinary action step (score 4) is a secondary application. Do not raise delivery scores before native acceptance and release.

## JTBD framing
When a responsibility follows a monthly weekday, I want to set it once so I can keep showing up. Serves `jtbd-move-the-few-things-that-matter`.

## Design
See [UI contract](../design-explorations/monthly-weekday-repeat/06-ui-contract.md). Custom → Months → Same week each month → Third → Sunday → Set. Add optional monthly `monthlyWeekday: { ordinal, weekday }`, with ordinal 1–5 or -1 for last and JS weekday 0–6. Missing pattern means legacy date-based recurrence. Preserve cadence intervals and local reminder time. Fifth skips unavailable months. Completion skips missed dates; new occurrences retain the pattern. Saving changes repeat settings, following existing behavior; the current due date is edited separately.

## Success signal
Save/reopen third Sunday and advance to the correct next future third Sunday; old rules remain stable. Local runtime proof precedes release. No added analytics.

## Open questions
Chores is excluded: its server scheduler does not support custom monthly recurrence; the shared drawer must only reveal this option for a supporting editor. None for to-do implementation. Native acceptance and release remain verification gates.

## Implementation plan
1. Add failing scheduler, payload, label, and editor tests.
2. Extend the monthly type and recurrence calculation; round-trip optional pattern through editor and persistence.
3. Add the monthly controls using existing UI components and review reduction.
4. Run focused tests, then verify:changed once; inspect the real Simulator route and record evidence.
