# Kwilt Context Primer

This file is injected into the Diverge phase of the [`design-thinking-loop`](../../.cursor/skills/design-thinking-loop/) skill. It exists so generated solution sketches reflect Kwilt's actual philosophy instead of generic SaaS shapes.

**Read this before generating solution alternatives. Never skip it.**

---

## The four-object model

Kwilt is organized around four objects, in this order:

- **Arc** — slow-changing identity direction; a domain of becoming. Not a project, not a category. Examples: *Discipleship*, *Family Stewardship*, *Becoming a Project Finisher*.
- **Goal** — a concrete outcome that expresses progress in an Arc over weeks or months. Two flavors: **identity-anchored** (changes who the user becomes — no metrics required) and **outcome-based** (clear observable result — may include simple metrics).
- **Activity** — atomic unit of doing. The plan in motion. Activities are the only forward-planning unit at the day level. Lists of Activities *are* the plan; there is no separate plan object.
- **Chapter** — AI-generated retrospective narrative over a date range. Always a lookback. Never a container for future planning.

**Design implication**: when generating solution alternatives, locate the proposed feature in this hierarchy. If it doesn't fit, that's a signal — either the feature is misframed or it's revealing a gap in the model.

## The Forces

Four growth dimensions, scored 0–3:

- **✨ Spirituality** — alignment with God, inner character, integrity, discipleship.
- **🧠 Mastery** — skill, clarity, craft, learning, problem-solving.
- **🏃 Activity** — physical doing, execution, embodied or hands-on work.
- **🤝 Connection** — relationships, service, support, collaboration.

**Force Intent vs Force Actual** is the meaningful distinction:
- Goals declare **Intent** — what kind of growth this Goal is *meant* to drive.
- Activities record **Actual** — what kind of growth the work *actually* engaged.
- The mismatch is signal. Surface it as observation, never as judgment.

**Design implication**: any feature that aggregates effort should expose Force Intent vs Actual mismatch as a primary insight surface. Don't reduce Forces to a composite "score" — that flattens the meaning.

## Capture-first principle

The system **never blocks capture**. An Activity can always be recorded without choosing an Arc or Goal. Unanchored Activities are first-class.

**Design implication**: any UI that requires Arc/Goal selection before capture violates the philosophy. Alignment is gentle, retroactive, optional. The retroactive-alignment surface (LOMO nudges) is occasional and skippable, never a queue of pending decisions.

## Identity-first language

The user is not "completing tasks" or "leveling up." They are *becoming someone*. Language anchors meaning to identity.

**Voice rules** (pull from [docs/ux-style-guide.md](../ux-style-guide.md) for the full set):

- Grounded and human. No corporate tone.
- Data-anchored interpretation with humble framing.
- Drift is information, not failure. Strengths emerge.
- Never overconfident psychoanalysis; never gamified affirmation.

## Anti-patterns (instant-fail signals)

If a generated solution sketch produces any of these, it has failed the Kwilt voice and should be revised or discarded:

- **Dashboards.** KPI grids, progress percentages on identity-anchored Goals, "health scores," composite indices.
- **Productivity-app voice.** "Crush it," "level up," "optimize your day," "you're falling behind."
- **Streaks attached to identity.** Streaks-on-Arcs, streak-loss alarms, decay animations.
- **Punitive drift framing.** "You haven't done X in N days." "Don't lose your progress." Red badges, urgency styling.
- **Forced commitment to dismiss.** Modal that requires "set a new Goal" before close.
- **Anthropomorphic AI.** "I'm here for you 💙," AI that pretends to feel, AI that shame-prompts.
- **Default-public sharing.** Feeds, leaderboards, share-to-unlock dark patterns.
- **Auto-anchoring without confirmation.** AI deciding which Arc an Activity belongs to without the user's say.
- **Reducing Forces to a score.** Single-number "growth index" that flattens the four dimensions.
- **Chapters that plan the future.** Chapters are retrospective only.

## Calm UX bar

Even features that pass the above checks can violate Kwilt's voice if they feel hot, urgent, or attention-extracting. The bar:

- **Notifications respect attention.** Default is calm; urgency is earned, not assumed.
- **No surprise data loss.** Capture is durable; user data is portable.
- **AI is a thoughtful companion, not a salesperson.** Suggestions feel observed-with, not sold-to.
- **Pricing is honest, transparency is default.** No dark-pattern monetization.

## Practical use during Diverge

When generating 3+ solution alternatives:

1. Each alternative must clearly *honor* the four-object model — name which object(s) it touches and why.
2. Each alternative must have a stance on capture-first (does it block capture? if so, why is that justified?).
3. Each alternative must pass the anti-pattern checklist. If it fails, either fix it or discard it — don't water it down.
4. The axis of variation between alternatives should be substantive (e.g. *AI-driven vs user-driven*, *in-app vs notification*, *deterministic vs ambient*, *synchronous vs asynchronous*, *solo vs invited*) — not three flavors of one idea.
