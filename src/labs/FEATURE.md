---
feature: labs
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves:
  - jtbd-trust-this-app-with-my-life
  - jtbd-move-the-few-things-that-matter
briefs:
  - kwilt-labs-capability-gating
status: shipping
last_reviewed: 2026-08-17
---

# labs

Keeps emerging Kwilt capabilities explicit, independently reversible, and inactive until a person chooses to try them.

## Surfaces in this folder

- `kwiltLabs.ts` - code-owned Labs catalog and defensive persistence parsing.
- `useKwiltLabsStore.ts` - device-local activation choices.

## Notes

Labs controls capability activation only. Each capability continues to own its data, permissions, preferences, and deletion behavior.
