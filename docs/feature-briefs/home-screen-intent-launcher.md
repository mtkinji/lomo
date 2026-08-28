---
id: brief-home-screen-intent-launcher
title: Configurable Kwilt Home Screen Launcher
status: accepted
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-focus-widget, brief-chat-widget]
owner: andrew
last_updated: 2026-08-27
---

# Configurable Kwilt Home Screen Launcher

## Context

Kwilt can help through Chat, Focus, Plan, To-dos, Goals, Meals, Money, Chores, and other capability-owned surfaces, but reaching the intended part of the app still begins with either separate widgets or in-app navigation. A ChatGPT-like hierarchy suggests a stronger Kwilt front door: a stable conversational entry plus a small set of direct actions chosen by the user.

## Target audience

The audience is `audience-burned-out-productivity-power-users`. Marcus already has enough tools and navigation; the launcher should reduce the distance between noticing what matters and entering the correct Kwilt surface. The related Chat-widget brief retains the AI-native audience and trust framing for the stable Ask Kwilt contract.

## Representative persona

Marcus has a question, a readiness to focus, a calendar check, or another concrete Kwilt job while his phone is already in hand. He knows what he wants and does not want to traverse a capability menu first. Ask Kwilt inherits the existing Chat-widget privacy and explicit-action boundaries rather than redefining them here.

## Aspirational design challenge

How might we give each person a fast, recognizable front door to the parts of Kwilt that matter most to them, while keeping Ask Kwilt universally available and avoiding a miniature app grid?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — the launcher earns Home Screen space by helping the user cross from intention into the next meaningful Kwilt action without rebuilding another navigation system.

## Job flow step

`job-flow-marcus-move-the-few-things-that-matter`, step 5: decide what to do next. It is scored 3. Plan and recommendations help inside Kwilt, but the system-level entry layer is split across individual widgets and ordinary app navigation.

## JTBD framing

When something becomes worth my attention, let me enter the exact part of Kwilt I mean to use (`jtbd-carry-intentions-into-action`) or capture a concrete intention without filing work (`jtbd-capture-and-find-meaning`), through a stable, private, predictable launcher that never guesses or exposes my life on the Home Screen (`jtbd-trust-this-app-with-my-life`).

## Design

### Widget composition

- Add one `systemMedium` WidgetKit configuration named `Kwilt Launcher`.
- Present four independently configurable, icon-only circular affordances across the upper row.
- Present one fixed full-width `Ask Kwilt` action across the bottom.
- Keep configuration and accessibility labels complete while the rendered widget stays label-free, confidently tappable, and readable in standard, dark, and tinted Home Screen appearances.
- Use Kwilt's canonical neutral secondary-control roles (`shellAlt`, border, and Sumi) for the four shortcuts. Do not introduce soft-pine or opacity-derived pine controls.
- Keep the shortcut circles visually subordinate to Ask Kwilt: use compact 58-point controls, distribute them evenly across the available row, and strengthen their neutral edge against the white widget surface without introducing another brand color.
- Center the shortcut circles optically in the region above Ask Kwilt; do not add an independent top inset that makes the upper gap larger than the gap below the circles.
- Nest the Ask Kwilt capsule with equal left, right, and bottom insets so it belongs to the widget's outer geometry rather than appearing vertically detached.
- Initial defaults are Focus, Calendar, To-dos, and Meals.

### Configuration

- Use `AppIntentConfiguration` with four optional scalar identifiers and slot-specific defaults.
- Offer only a bounded registry of stable Kwilt destinations and actions: Focus, Calendar, To-dos, Add To-do, Goals, Arcs, Chapters, Meals, Recipes, Groceries, Chores, Money, Screen Time, Games, and Explore.
- Honor the user's position order and selections. V1 does not attempt cross-slot uniqueness; duplicate choices remain visible instead of being silently normalized.
- Keep Ask Kwilt out of the configurable list because it is always available below.
- Store no launcher configuration in the backend or app profile.

### Destination behavior

- Every shortcut deep-links directly to its existing owning surface with `source=widget` attribution.
- Calendar opens today's existing Plan calendar; Kwilt has no separate Today screen.
- To-dos opens the To-dos screen. Add To-do opens that same screen with Quick Add focused.
- Focus opens the existing deliberate duration-and-audio setup. When active or paused, a configured Focus shortcut shows compact time state and returns to the existing controls.
- Ask Kwilt opens `kwilt://chat?entry=fresh&mode=conversation&source=widget`, never auto-records, and creates no durable thread before first valid send.

### Privacy and reduction

- Show no object names, thread content, event titles, money values, household details, recommendations, badges, or urgency.
- Add no in-app launcher screen, widget manager, custom URL editor, automatic ranking, or new domain model.
- Keep the existing small Chat and Focus widgets registered during the learning release; promote the launcher in existing widget setup copy and decide retirement only from dogfood evidence.

## Learning release

Implement the complete launcher in the generated native source, prove it in a local widget-enabled Simulator build, and then consider Andrew-only TestFlight distribution through `production-widgets`. The full release and evaluation contracts live in [`04-learning-release.md`](../design-explorations/home-screen-intent-launcher/04-learning-release.md) and [`05-evaluate-learning.md`](../design-explorations/home-screen-intent-launcher/05-evaluate-learning.md).

## Success signal

The launcher remains installed through 7–14 days of ordinary use, replaces the practical Chat/Focus footprint, routes repeatedly to at least three configured destinations, keeps Ask Kwilt primary, and preserves legible active-Focus state without private content or navigation surprises.

## Open questions

- Whether the provisional fourth default should remain Meals after dogfood.
- Whether dedicated small Chat and Focus configurations continue to earn separate gallery entries.
- Which destinations, if any, are repeatedly missing from the bounded list.

## Spec refinement

- Four configurable positions are a firm product requirement; implementation must adjust shape, spacing, and type rather than reduce the count.
- Each position uses a distinctive icon without a visible label. The full label remains visible in Edit Widget and available to assistive technology.
- Duplicate selections are honored in V1 because cross-parameter filtering would add configuration complexity and silent normalization would violate user intent.
- App Intent parameters persist scalar string ids using the proven Money-widget pattern; the native registry supplies labels, symbols, routes, and defaults.
- The launcher kind is `KwiltWidgets.launcher`; Focus state changes reload both `KwiltWidgets.focus` and `KwiltWidgets.launcher` immediately.
- Existing small Chat and Focus widgets remain registered in this learning release.
- Acceptance requires generator-contract red/green coverage, route parsing coverage for launcher destinations, focused Focus-reload tests, generated Swift typecheck/native build, and actual Home Screen add/edit/tap screenshots. Source tests and compilation alone are not visual acceptance.
