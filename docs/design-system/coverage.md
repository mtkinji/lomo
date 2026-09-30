# Design-system coverage and remaining work

Snapshot: 2026-09-28. This is a documentation coverage map, not an app conformance certificate. Existing maturity in each source remains authoritative.

| Area | Current authority / starting point | Remaining completeness work |
| --- | --- | --- |
| Authority and dos/don'ts | [Constitution](ui-constitution.md) | Link rule-specific positive and negative rendered examples |
| Tokens and material | [Inventory](component-inventory.md), [semantic color](semantic-color.md), [propagation](foundation-propagation.md) | Map material variants and platform/accessibility fallbacks; Origin obscuring is a candidate |
| Component selection | [Inventory](component-inventory.md), [Storybook](storybook.md) | Audit consumers and local replicas; resolve candidates without self-promotion |
| Fields, pickers and composers | [Inputs](input-guidance.md), [pickers](picker-guidance.md) | Existing input migration ledger owns its unfinished rollout |
| Drawers and fixed action regions | [Drawers](drawer-guidance.md), [atlas](pattern-atlas.md) | Audit gutter ownership, semantic footer versus dock, legacy/raw sheets; verify background treatment |
| Group composition and spacing | Constitution; atlas settings, dock and composer patterns | Add accepted Do/Don't comparisons for group rhythm, alignment, density and content wrapping |
| Whole pages | Atlas settings, inventory, object detail, edit/create, onboarding | Inventory real routes and resolve Candidate/Missing patterns; include normal and recovery states |
| Cross-screen continuity | Atlas onboarding and local feature contracts; [Origin promise-led Candidate](references/origin-mobile/first-run-2026-09/pattern-extraction.md) | Origin's 27-screen archive and analysis cataloged; capability mappings, transition/return/recovery evidence and promotion remain open |
| Accessibility and adaptive layout | Constitution and component contracts | Route-level evidence at target sizes and supported accessibility settings |
| Reference intake and application | [Workflow](inspiration-workflow.md), [catalog](references/README.md) | Capture more references as supplied; close findings only with corresponding proof |

## Initial audit

[Drawer background source audit](audits/2026-09-28-drawer-background.md) establishes the first reference-to-owner mapping. Other app surfaces remain unreviewed by this workflow. A full audit must first enumerate routes and local implementations, then report inspected and remaining scope explicitly.

Comprehensive completion requires documented selection rules, dos and don'ts, semantic implementation owners, composition contracts, explicit exceptions, and current evidence across the inventoried app. Neither this map nor the number of references proves completion.
