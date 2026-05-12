---
id: audience-ai-native-life-operators
title: AI-native life operators
representative_persona: Nina
status: draft
hero_jtbd: jtbd-trust-this-app-with-my-life
supporting_jtbds:
  - jtbd-capture-and-find-meaning
  - jtbd-move-the-few-things-that-matter
  - jtbd-see-my-arcs-in-everyday-moments
  - jtbd-trust-this-app-with-my-life
last_updated: 2026-05-08
---

# AI-native life operators

## Representative persona: Nina

Nina already uses AI tools to think, plan, draft, reflect, and operate. She wants Kwilt to be available where she works, not trapped behind one mobile UI. But she is also sensitive to trust: AI can suggest and operate, but it cannot silently rewrite her life.

## Why Kwilt Might Matter

Kwilt can give Nina a personal operating system that is structured enough for AI to help with and intimate enough to require permission, preview, and undo.

## What Nina Is Trying To Do

- Capture from the tools where she already thinks.
- Ask AI about her Arcs, Goals, Activities, and Chapters.
- Batch organize and inspect her system.
- Keep AI actions transparent and reversible.

## What Would Make This Feel Wrong

- AI actions without preview or undo.
- Connectors that expose too much personal data.
- Dense dashboards that lose the identity context.
- A mobile-only workflow for work that belongs on desktop or in AI tools.

## Demand Hierarchy

Hero JTBD:
- `jtbd-trust-this-app-with-my-life` - Nina will only let AI operate near her life system if Kwilt is inspectable, permissioned, and reversible.

Supporting JTBDs:
- `jtbd-capture-and-find-meaning` - she wants to capture from the tools where thoughts and commitments already happen.
- `jtbd-move-the-few-things-that-matter` - AI should help organize action around the few commitments that matter.
- `jtbd-see-my-arcs-in-everyday-moments` - external tools should keep identity context visible without forcing app-hopping.

Feature-level descent:
- MCP, external connectors, and AI operator workflows descend from `jtbd-trust-this-app-with-my-life`.
- Cross-tool capture descends from `jtbd-capture-and-find-meaning`.
- Desktop command center, batch edits, and planning views descend from `jtbd-move-the-few-things-that-matter`.

## Common Active JTBDs

- `jtbd-capture-and-find-meaning`
- `jtbd-move-the-few-things-that-matter`
- `jtbd-see-my-arcs-in-everyday-moments`
- `jtbd-trust-this-app-with-my-life`

## Evidence In The Product

- `docs/feature-briefs/desktop-app.md`
- `docs/feature-briefs/kwilt-phone-agent.md`
- `docs/feature-briefs/external-ai-connector.md`
- `docs/mcp-strategic-proposal.md`
- `docs/kwilt-cross-workspace-cursor-planning.md`
- `src/navigation/RootNavigator.tsx`
