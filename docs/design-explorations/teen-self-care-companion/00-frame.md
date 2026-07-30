# Frame: Pixel Pet

## What the user said

> How can we take the idea of building healthy patterns and habits through a digital pet and make that work for Kwilt's mostly-teen users, even without a graphic artist or character animator?

## Restated in user voice

When I am trying to take better care of myself, I want small healthy choices to create something warm and visible that feels like mine, so I can notice who I am becoming without being scored, watched, or lectured by my parents.

## Target audience

Provisional: teens building self-direction with family support. This audience does not yet have a canonical entry in `docs/personas/`.

## Representative persona

Charlie, provisional: a teen with their own phone who understands that sleep, movement, hygiene, food, emotional regulation, and intentional phone use affect how life feels, but does not want another adult-authored checklist.

- Current situation: Charlie has uneven routines and a phone full of stronger, faster rewards.
- What they're trying to become/do: take more ownership of daily care and feel capable of returning after an off day.
- Emotional state or tension: wants encouragement and independence, but resists anything childish, diagnostic, or surveillance-shaped.
- What would make this feel wrong: a needy pet that suffers when Charlie misses a task, a parent-visible behavior score, a chores-for-rewards economy, or a mascot that pretends to be an emotionally dependent AI friend.

## Hero anchor

`jtbd-see-who-im-becoming` - the companion should make ordinary acts of care feel like evidence of becoming, not points accumulated in a habit tracker.

## Job flow step

There is no canonical teen job flow yet. The provisional flow is:

1. Notice a pattern Charlie wants to feel better about.
2. Choose one small, self-authored act of care.
3. Do it in ordinary life without needing to prove it.
4. See a warm, immediate consequence in Kwilt.
5. Notice the pattern becoming part of who Charlie is.
6. Return without shame after drift.
7. Invite bounded family support only when Charlie chooses or an explicit family agreement requires it.

Current delivery is strongest at connecting Activities to Goals and Arcs, but weak at making a young person's repeated care feel emotionally alive without dashboards, streaks, or tracking work. The adjacent Maya job flow scores family participation 2/5 and keeping the system helpful rather than fussy 3/5.

## Active anchors

- `jtbd-see-who-im-becoming` - daily self-care should make identity growth felt.
- `jtbd-feel-arc-progress-without-tracking-tools` - the companion can reveal motion from actions already captured without adding a progress dashboard.
- `jtbd-recover-when-i-drift-from-an-arc` - missing a day must lead to a gentle return, never pet harm or guilt.
- `jtbd-put-intention-before-impulse` - a self-authored companion ritual may help a teen make one meaningful move before phone drift.
- `jtbd-trust-this-app-with-my-life` - teen privacy, clear family boundaries, and non-manipulative feedback are prerequisites.

## Friction we're addressing

Healthy actions have delayed, abstract rewards while entertainment apps offer immediate ones. Existing task and goal systems can describe what to do, but they do not give a teen a warm, immediate sense that a small act changed something. Parent-managed routines can increase compliance while weakening ownership if Kwilt turns the teen into a score the caregiver watches.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surfaces: Chat, the capability menu, To-dos, Focus sessions, Goals, Arcs, Household child capabilities, Screen Time agreements, and lightweight completion celebrations. Kwilt does not have a routed Home surface.
- Existing user flow: a real action can already be captured or completed and linked to longer-term becoming.
- Existing domain/data model: Activities remain the canonical action/completion record; Goals and Arcs carry intention and identity; Household and capability grants carry family authority.
- Existing technical affordances: static illustrations, emoji, simple shape/icon composition, semantic haptics, sound, and lightweight motion are already available without a character-animation pipeline.
- Existing UX/copy conventions: calm, concrete, identity-shaped, recoverable, and explicit about privacy and authority.

Constraints to preserve:

- No separate self-care task database when an Activity can carry the meaning.
- No streak pressure, health score, overdue shame, or pet suffering.
- No chores-to-points or automatic chores-to-Screen-Time economy.
- No caregiver surveillance of private reflections, moods, or self-authored care.
- No anthropomorphic AI that claims needs, dependency, or an emotional bond.
- Teen-owned use and caregiver-supported use remain distinct modes.

Constraints we may challenge:

- Kwilt currently expresses progress mostly through words, records, and existing celebration. A persistent visual companion would be a new presentation layer.

Design implication:

The low-art answer is not a lesser animated mascot. It is a deliberately simple living object assembled from reusable visual parts and a very small motion vocabulary. Its state should reflect care as welcome, energy, curiosity, or environmental change—not health, obedience, or moral worth.

## Aspirational design challenge

How might we help Charlie feel that one small act of self-care changed something warm and alive today, while preserving teen autonomy, a shame-free return, family privacy, and Kwilt's identity-centered product grammar?

## Out of scope

- A full virtual-pet game economy, item shop, or collectible catalog.
- Clinical mental-health assessment or treatment claims.
- Parent dashboards, behavior scoring, or proof-of-completion systems.
- Bespoke frame-by-frame character animation.
- Automatic Screen Time rewards or restrictions based on care completion.

## Direction chosen after framing

The creature is a deliberately pixel-based Pet intended eventually to live in a dedicated, Labs-enabled capability. Before changing the app, the interaction and art system will be tested in a standalone, phone-shaped site prototype. Chat may eventually explain a Pet event or offer a handoff, but the Pet does not recur through the timeline and does not become the chatbot. A small display habitat gives the Pet a place to live without committing the concept to a navigable ecosystem.
