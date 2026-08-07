# Kwilt UI Constitution

This document is the binding design-system contract for product UI in Kwilt. It turns ShadCN's upstream model into a localized React Native system without confusing reference quality with implementation technology.

## Authority

When sources disagree, use this order:

1. The user's current explicit decision and the accepted product contract.
2. Platform behavior and accessibility requirements.
3. This constitution, semantic tokens, canonical Kwilt UI components, and approved pattern-atlas entries.
4. ShadCN as the upstream reference for anatomy, composition, variants, states, accessibility, and quality.
5. Adjacent production surfaces, but only for behavior or patterns that remain approved.
6. Candidate and feature-local components within their documented scope.

An existing screen proves what shipped, not what is canonical. A stale guide, mockup, screenshot, or feature-local implementation cannot override this order.

## The Translation Contract

ShadCN is the intended design-system model. Kwilt UI is its localized implementation.

| Preserve from ShadCN | Localize for Kwilt |
| --- | --- |
| Source ownership | React Native implementation |
| Semantic component names and variants | Kwilt brand color and typography |
| Composable anatomy | Touch, haptics, safe areas, keyboard, and gestures |
| Accessible defaults | Native navigation and drawer behavior |
| Complete interaction and error states | Capability-specific meaning and vocabulary |
| Token roles and restrained visual hierarchy | Kwilt motion and illustration language |
| Documented usage boundaries | Mobile density and accessibility scaling |

Do not copy Tailwind classes, Radix/Base UI APIs, hover-first behavior, default dark-dashboard styling, or exact ShadCN theme values into the native app. Do not dilute ShadCN into a mood-board adjective either. A localized component should still have recognizable anatomy, semantic variants, complete states, accessibility, and a small composable API.

## Canonicality

- **Canonical** components and patterns are the default implementation authority for their documented use.
- **Candidate** components may be reused only inside their current scope when their semantics and behavior fit. They must not silently spread across capabilities.
- **Promote** means ready for deliberate hardening; it does not mean canonical yet.
- **Keep local** means domain-owned. It can compose canonical primitives but is not a general primitive.
- **Hybrid** means the final contract is unresolved and must not be invented inside feature work.

An agent may prepare promotion evidence but may not self-declare a component or pattern Canonical. Promotion requires an explicit product/design-owner decision recorded in the inventory or atlas. If scope or maturity is missing, treat the item as Candidate and local to its current use.

Raw React Native views are allowed as tokenized layout glue. They may arrange content but must not recreate a Button, Card, Input, Sheet, Dialog, Menu, Badge, Switch, picker, or another known semantic primitive. If no canonical component fits, either compose canonical primitives without duplicating semantics or promote a missing component deliberately with Storybook, inventory, accessibility, and pattern evidence.

## Information Hierarchy

Every material surface must define before implementation:

- **Three-second read:** what the user should understand immediately.
- **Primary action:** the one action with dominant visual weight.
- **Primary information:** what is needed to decide or act now.
- **Secondary information:** useful after orientation, visually quieter.
- **Reveal later:** detail or controls hidden until requested.
- **Scan order:** the intended first, second, and third focal points.
- **Nearest precedent:** the approved pattern or production surface being extended, plus the meaningful differences.

One primary action means one dominant action for the screen's current decision—not one green button per card. Contextual actions must be quieter and local. If every section looks important, the hierarchy has failed.

## Composition Rules

- Start with the page canvas and content relationships; add a Card only when a distinct surface or interaction boundary is meaningful.
- Do not nest cards merely to create spacing or grouping.
- Use headings, whitespace, alignment, and typography before borders, badges, tinted fills, or shadows.
- Use semantic color to communicate brand, state, relationship, or meaning—not to decorate every action.
- Helper copy may clarify consequence or unfamiliar vocabulary. It must not compensate for weak labels, grouping, or hierarchy.
- Use one density and spacing rhythm per region. Arbitrary values and nearly identical gaps are evidence of an unresolved composition.
- Prefer a flat, legible reading order over dashboard grids unless comparison is the user's actual job.
- Preserve realistic long, missing, loading, empty, error, disabled, permission, success, and persisted states without letting state chrome dominate the normal surface.

## Visual Acceptance

Token correctness and functional behavior are necessary but insufficient. A material UI change is not accepted until reviewable render evidence shows:

1. The real route in the current target runtime.
2. Realistic content at the smallest supported viewport and accessibility text size.
3. Relevant non-ideal and transition states.
4. A comparison with the nearest approved precedent.
5. A fresh visual-critic pass that ignores implementation rationale and judges only the rendered result.

The critic must identify the first focal point and scan order from the render, count dominant actions, call out unnecessary surface depth, and explain whether typography, spacing, color, and component composition feel like one system. If the intended hierarchy has to be explained, it did not render clearly enough.

Hierarchy, composition, system fit, and runtime proof are critical gates. Any failure requires a fix and rerender; none can be deferred as polish.

## Exceptions

Document exceptions beside the affected component or pattern with:

- the unmet need;
- why no canonical option fits;
- the ShadCN reference and Kwilt precedent considered;
- the smallest scope of the exception;
- the owner or decision that authorizes it;
- the condition for removal or promotion.

An exception is not permission to introduce raw theme values or a second component system.
