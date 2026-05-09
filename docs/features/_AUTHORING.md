# Feature Manifest Authoring

Feature manifests make Kwilt's codebase self-documenting at the feature-folder level. A feature brief explains a time-bounded change; a `FEATURE.md` explains what a feature folder currently serves.

## Where Manifests Live

Every direct subfolder of `src/features/` must contain a `FEATURE.md`, except folders explicitly exempted in `scripts/product-lint.mjs` (`dev/` today).

Files inside a feature folder inherit the folder manifest. Do not add per-file JTBD annotations. If a nested folder genuinely serves a different audience/hero job, it may add its own `FEATURE.md`, but that should be rare.

## Required Front-Matter

```yaml
---
feature: goals
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves:
  - jtbd-move-the-few-things-that-matter
  - jtbd-carry-intentions-into-action
briefs:
  - arc-goal-lifecycle-and-limits
status: shipped
last_reviewed: 2026-05-09
---
```

Field meanings:

- `feature` must match the folder name.
- `audiences` references ids from `docs/personas/`.
- `personas` references named representative personas from `docs/personas/_index.md`.
- `hero_jtbd` is the main audience-level job for the folder.
- `job_flow` references `docs/job-flows/` when a matching flow exists for the audience and hero JTBD.
- `serves` lists the supporting or feature-level JTBDs the folder realizes.
- `briefs` lists `docs/feature-briefs/<slug>.md` files that explain how the folder got here.
- `status` is one of `draft`, `shipping`, `shipped`, or `sunset`.
- `last_reviewed` is a `YYYY-MM-DD` date.

## Body Shape

Keep the body human-readable and short:

```markdown
# goals

Helps Marcus keep the few commitments worth carrying visible and actionable, without turning progress into another productivity system to maintain.

## Surfaces in this folder

- `GoalsScreen.tsx` - primary goals inventory and management surface.
- `GoalCreationFlow.tsx` - turns an Arc-level intention into a concrete Goal.

## Notes

The core goals surface serves Marcus' focus job; the share and join surfaces extend the folder into private accountability.
```

## Linting

Run:

```bash
npm run product:lint
```

The lint checks:

- every non-exempt feature folder has `FEATURE.md`;
- manifest front-matter fields resolve to real audiences, personas, JTBDs, job flows, and feature briefs;
- feature briefs with front-matter stay coherent with the manifests that reference them;
- `last_reviewed` does not silently go stale.

`npm run jtbd:lint` remains an alias for compatibility.

## Common Mistakes

- Do not annotate files one by one. The feature folder is the documentation unit.
- Do not force every utility or service into a manifest. Code outside `src/features/` is enabling infrastructure.
- Do not list every plausible JTBD. Prefer the smallest truthful set.
- Do not use a feature manifest as a build spec. Put time-bounded decisions in `docs/feature-briefs/`; keep `FEATURE.md` as the current map.
