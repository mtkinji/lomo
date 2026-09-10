# Learning from Instagram: a more personal Kwilt Home

September 9, 2026 · Proposal, not implemented

**Recommendation:** evolve Home into a people-led, media-rich shared-life feed. Make seeing a moment, understanding who shared it, responding, and sharing something yourself feel like one continuous experience.

The opportunity is bigger than removing borders. Kwilt already has much of the functional foundation; its presentation still often resembles a collection of forms and controls. Instagram's useful lesson is how identity, content, response, and navigation cooperate.

- [40 learnings and their Kwilt applications](catalog.md)
- [Design loop, three directions, and acceptance criteria](design.md)
- [Phased implementation plan](../../superpowers/plans/2026-09-09-kwilt-home-instagram-ux.md)
- [Existing Home feature brief](../../feature-briefs/kwilt-home-shared-life.md)
- [Eight ready concepts after mockup review](../kwilt-home-ready-concepts/README.md) — refined interaction and state contracts supersede preliminary choices below.

## The most consequential changes

1. Put faces and moments at the center: recognizable authors, generous photography, good text posts, and distinct compact household updates.
2. Give every post a predictable grammar: person → moment → response → conversation, with visible audience context.
3. Make photo sharing feel like sharing a photo: start with the selected content, then caption and an explicit audience.
4. Make responding feel immediate: local feedback, individual retries, and conversations that retain the original moment.
5. Make navigation feel stable: Home remains the first main-menu item; a compact Home view selector replaces the wrapping filter toolbar.
6. Make revisiting valuable: people histories, saved moments, and eventually collections or household journals.
7. Treat performance, accessibility, and trust as part of the experience: preserve scroll position, recover drafts, avoid surprise disclosures, and keep controls usable.

## Evidence and limits

The primary references are Andrew's two supplied Instagram screenshots, called S1 and S2 in the catalog. They establish visible hierarchy and affordances, not actual gesture behavior, latency, accessibility, ranking, or universal Instagram availability. Official Meta announcements supplement them and are dated in the catalog. Proposed Kwilt behavior is explicitly identified as a proposal.

Kwilt comparison uses the current dirty checkout at `/Users/andrewwatanabe/Kwilt`, branch `main`, base commit `9db7bd690f63936641588a61e974d0d6f07db8b3`, inspected September 9. Relevant source is listed in the implementation plan. The saved [Home screenshot](../../../artifacts/home-sharing-review/home.png) shows the earlier empty-state presentation; it is not evidence of a populated feed or the latest chore card. No fresh native runtime session was run for this review.

The recent Chores decision supersedes the older blanket rule against automatic posts: chore completions produce household-only system updates. Other personal moments still require an explicit post action. This proposal preserves that distinction.

## Suggested build order

**First release:** an expressive, dependable mixed feed, including media browsing, compact chores, readable text posts, and contextual responses. **Second:** content-led composition and consistent capability handoffs. **Third:** richer people, saved history, and truthful catch-up signals. **Next:** short clips, collections, and household journal experiences, each with a complete lifecycle rather than decorative placeholders.

This sequence improves the existing product while keeping the larger vision intact. It does not require replacing Kwilt's navigation or turning every capability into a social feed.
