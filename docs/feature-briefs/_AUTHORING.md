# Feature Brief Authoring Conventions

This file documents the shape of feature briefs in `docs/feature-briefs/`. Feature briefs are the durable product artifact that emerges during Kwilt's build flow: every shipped feature traces back through a feature brief to a target audience, a named representative persona in [`docs/personas/`](../personas/), a hero JTBD, a job flow, and a set of `serves: [jtbd-...]` ids in [`docs/jtbd/`](../jtbd/).

## When to create or update a feature brief

The user should not have to remember to "write a brief" as a separate ceremony. When the [`design-thinking-loop`](../../.cursor/skills/design-thinking-loop/) skill reaches its **Build** phase, it creates or updates a feature brief as part of preparing the Cursor Build plan. Feature briefs may also be authored directly for larger strategic surfaces (e.g. monetization, platform decisions) where the full design loop already happened in a different forum.

## Required front-matter for new feature briefs

Going forward, every new feature brief starts with YAML front-matter:

```yaml
---
id: brief-<kebab-case-slug>
title: <one-line title>
status: draft  # draft | accepted | shipped | retired
audiences: [audience-<id>]     # required; primary target audience first
personas: [<Name>]             # required; named representative persona first
hero_jtbd: jtbd-<id>           # required; main audience-level job
job_flow: job-flow-<id>        # required when a matching docs/job-flows file exists
serves: [jtbd-<id>, jtbd-<id>]   # required; must reference real JTBD ids in docs/jtbd/
related_briefs: []
owner: andrew
last_updated: YYYY-MM-DD
---
```

`audiences:`, `personas:`, `hero_jtbd:`, `job_flow:`, and `serves:` are the load-bearing fields — they link the supply-side artifact back to who we are designing for, the main audience-level job, the current delivery gap, and the supporting or feature-level jobs active for that person. Put the primary audience and representative persona first. `npm run product:lint` validates these links.

Feature briefs should improve a job-flow delivery score or explain why the work is necessary even if the score will not move immediately. After ship, update the referenced job flow if the feature brief changed the current Kwilt flow, offerings, delivery score, or gap.

## Required body sections

```markdown
## Context

[One paragraph: what's the situation that makes this feature brief necessary right now]

## Target audience

[Name the primary audience from `audiences:` and describe why this feature matters for that audience.]

## Representative persona

[Name the representative persona from `personas:` and describe the specific situation they are in.]

## Aspirational design challenge

[How might we help <persona> <better way to satisfy the job>, while preserving <important Kwilt principle or constraint>?]

## Hero JTBD

[`hero_jtbd`] — [Name the main audience-level job and why it is the demand spine for this feature brief.]

## Job flow step

[Name the job-flow file, underserved step, current Kwilt offering, delivery score, and gap this feature brief improves.]

## JTBD framing

[One paragraph: restate the work in user voice, citing `hero_jtbd:` and the supporting or feature-level JTBD ids in `serves:`. This is what the assess-against-jtbd skill produced during Frame, after audience/persona selection.]

## Design

[The core of the feature brief: what we're building, how it works, key user-facing behavior. Includes diagrams, screen sketches, data shape, AI behavior, etc. as appropriate.]

## Success signal

[How we'll know it worked. Not necessarily a metric — could be qualitative ("the user can name their Arcs in their own voice a month later"). Tied directly to the `serves:` JTBDs and the referenced job-flow delivery score.]

## Open questions

[Things still unresolved at feature brief-acceptance time. Updated as we go.]
```

## Existing feature briefs (pre-front-matter)

Feature briefs already in `docs/feature-briefs/` from before this convention stay as-is. When we touch one substantively, we add a short trailer section:

```markdown
## JTBDs served

This feature brief serves:
- Audience: `audience-<id>` — [one-line rationale for the audience link]
- Persona: `<Name>` — [one-line rationale for the representative persona]
- `jtbd-<id>` — [one-line rationale for the link]
- `jtbd-<id>` — [one-line rationale]

See [`docs/personas/_index.md`](../personas/_index.md) and [`docs/jtbd/_index.md`](../jtbd/_index.md) for the taxonomies.
```

No mass migration. We backlink incrementally as feature briefs come back into edit.

## Why no separate `docs/specs/` directory

Feature briefs absorb the spec role for Kwilt. The `design-thinking-loop`'s Build phase writes its output as a feature brief. There's no parallel spec file. One supply-side artifact prevents the two-taxonomy confusion that almost always happens when teams add a "spec" alongside an existing "feature brief" pattern.

## Status field semantics

| Status     | Meaning                                                               |
| ---------- | --------------------------------------------------------------------- |
| `draft`    | Being written or actively iterated on; not yet committed to building. |
| `accepted` | Committed; engineering work has started or will start imminently.    |
| `shipped`  | Feature is live in production. `kwilt-reflect` should run after this. |
| `retired`  | No longer relevant; preserved for history. Don't delete.              |

## Linting

```bash
npm run product:lint
```

Validates feature brief front-matter, FEATURE.md manifests, JTBD references, audience/persona/job-flow links, and bidirectional drift between feature briefs and feature manifests. `npm run jtbd:lint` remains an alias.

## Cross-repo

Feature briefs may live in any of the three workspace roots (Kwilt mobile, kwilt-site, kwilt-desktop). All three reference the same JTBD ids via the symlinked `docs/jtbd` directory. The lint script runs against feature briefs in whichever repo it's invoked from.

## Related

- [`docs/personas/_index.md`](../personas/_index.md) — persona taxonomy.
- [`docs/jtbd/README.md`](../jtbd/README.md) — JTBD authoring conventions.
- [`docs/jtbd/_index.md`](../jtbd/_index.md) — flat list of all JTBD ids for quick lookup.
- [`design-thinking-loop` SKILL](../../.cursor/skills/design-thinking-loop/SKILL.md) — the orchestrator that produces new feature briefs.
