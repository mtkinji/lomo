# Unified Chat Run Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Unified Chat a compact, collapsible, status-aware view of agent work without turning agent execution into the user's Goals, Activities, To-dos, or Plan.

**Architecture:** Native Kwilt continues to own run lifecycle and projects credential-free events through protocol v1. The Kwilt-hosted web workbench renders those events with a small compound `RunPlan` modeled on AI Elements' `Plan` and `Task`; the renderer uses the site's existing shadcn/Radix conventions and does not import the React 19/Tailwind 4 registry component directly into this React 18/Tailwind 3 app.

**Tech Stack:** Expo SDK 54, React Native, TypeScript, Jest, Next.js 14, React 18, Radix Collapsible, CSS Modules, Node test runner.

---

## UI contract

- **Job:** When Kwilt takes time to respond, the user needs to understand its current work and whether it succeeded, so they can trust the system without maintaining another plan.
- **Primary action:** Expand or collapse run details.
- **Must show:** Working/failed state and user-legible run events.
- **Reveal later:** Event descriptions and multiple execution steps.
- **Must not add:** User checkboxes, percentages, a new screen, fabricated steps, hidden reasoning, or unsupported run controls.
- **Reuse map:** `UnifiedChatRun` -> workbench `Run.events`; AI Elements `Plan` -> `RunPlan`; AI Elements `Task` -> status rows; shadcn `Collapsible` -> disclosure behavior.
- **Behavior sources:** Existing protocol-v1 run events, the accepted Unified Chat brief, and the user's decision that agent work remains distinct and visually small.
- **Unresolved decisions:** Durable autonomous run-step persistence and Stop/steer execution remain outside this refinement.
- **Required states:** optimistic start, active event, failed event, completed response handoff, reduced motion, and narrow mobile viewport.
- **Proof path:** `https://www.kwilt.app/embed/chat` inside the `UnifiedChat` WebView on an iPhone-sized viewport.

## File map

- `src/features/unifiedChat/runUnifiedChatTurn.ts` — report the locally durable active aggregate before the remote AI request begins.
- `src/features/unifiedChat/runUnifiedChatTurn.test.ts` — prove the active run is reported in order.
- `src/features/unifiedChat/UnifiedChatScreen.tsx` — publish that active aggregate to the workbench snapshot.
- `src/features/unifiedChat/buildWorkbenchSnapshot.ts` — use user-legible response lifecycle copy.
- `src/features/unifiedChat/workbenchProtocol.ts` — admit pending run events for future truthful multi-step plans.
- `src/features/unifiedChat/buildWorkbenchSnapshot.test.ts` — lock the projected event contract.
- `docs/feature-briefs/unified-chat-foundation.md` — preserve the agent-plan versus user-plan boundary.
- `/Users/andrewwatanabe/kwilt-site/components/ui/collapsible.tsx` — shadcn-compatible Radix primitive.
- `/Users/andrewwatanabe/kwilt-site/components/unified-chat/RunPlan.tsx` — compact Plan/Task compound rendering.
- `/Users/andrewwatanabe/kwilt-site/components/unified-chat/RunPlan.module.css` — quiet mobile-first visual treatment.
- `/Users/andrewwatanabe/kwilt-site/components/unified-chat/KwiltChatWorkbench.tsx` — replace generic thinking dots and standalone failure block with `RunPlan`.
- `/Users/andrewwatanabe/kwilt-site/lib/unifiedChatProtocol.ts` — validate pending, active, complete, warning, and failed events.
- `/Users/andrewwatanabe/kwilt-site/lib/unifiedChatRunPlan.ts` — pure run-to-view-state mapping.
- `/Users/andrewwatanabe/kwilt-site/lib/unifiedChatRunPlan.test.ts` — active, multi-step, failed, and completed mapping tests.

### Task 1: Publish truthful active run state

- [ ] Extend `RunUnifiedChatTurnInput` with `onRunStarted?: (aggregate) => void`.
- [ ] Add a failing test asserting the callback receives the inserted user message and active run before `sendCoachChat` begins.
- [ ] Construct the active aggregate from returned durable records, invoke the callback, and pass `setAggregate` from `UnifiedChatScreen`.
- [ ] Change the single lifecycle event label from `Thinking` to `Preparing a response` and update its focused test.
- [ ] Run `npm test -- --runInBand src/features/unifiedChat` and expect all Unified Chat suites to pass.

### Task 2: Add the web work-plan model and disclosure primitive

- [ ] Add `@radix-ui/react-collapsible` and the standard shadcn-compatible wrapper in `components/ui/collapsible.tsx`.
- [ ] Write failing Node tests for `buildRunPlanView`: active single-step copy, active multi-step counts, failed recovery copy, and completed hidden state.
- [ ] Implement the minimal pure mapping in `lib/unifiedChatRunPlan.ts` and run `npm test`.

### Task 3: Render the reductive Plan/Task treatment

- [ ] Add `RunPlan.tsx` using an outer collapsible header and inner status rail; use circles/check/error marks, not checkboxes.
- [ ] Add CSS Module styles with one quiet border/rail, 44px disclosure target, contained failure color, and reduced-motion behavior.
- [ ] Replace generic thinking dots and the separate failed block in `KwiltChatWorkbench.tsx`; synthesize only the truthful `Preparing a response` event during the pre-snapshot optimistic interval.
- [ ] Run the reduction pass and remove duplicate working/failure labels.
- [ ] Run `npm test` and `npm run build` in `kwilt-site`.

### Task 4: Verify the integrated path

- [ ] Run `npm run verify:changed -- --run` in Kwilt.
- [ ] Run focused protocol and workbench tests in both repositories.
- [ ] Render the actual embed at an iPhone-sized viewport and exercise collapsed, expanded, active, failed, and reduced-motion states where reachable.
- [ ] Score job clarity, reduction, hierarchy, system fit, interaction, states, resilience, and runtime proof; fix every critical failure before handoff.

## Self-review

- Spec coverage: active lifecycle publication, protocol reuse, compact disclosure, status rows, failure handling, accessibility, and cross-repo verification are mapped above.
- Placeholder scan: no deferred implementation placeholder is part of this slice; autonomous step generation and cancellation are explicit exclusions.
- Type consistency: both products continue to use protocol-v1 `Run.events`; the new site mapping consumes the existing event/status union without a bridge-version change.
