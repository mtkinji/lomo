# FTUX Agent-Hosted Survey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the FTUX survey to the previous agent timeline presentation while keeping the new activation-first deterministic question set.

**Architecture:** The 3-screen full-color FTUX intro remains in `FirstTimeUxFlow`. After "Let's begin", `AgentWorkspace` hosts the first-time onboarding workflow. `IdentityAspirationFlow` streams a short assistant lead-in through `AiChatPane`, then renders each deterministic survey question as a `SurveyCard` in the workflow `stepCard` slot with the freeform composer hidden.

**Tech Stack:** React Native, Expo, Zustand workflow runtime, `AgentWorkspace`, `AiChatPane`, `SurveyCard`, `@kwilt/arc-survey`.

---

## Product Contract

- The user should feel like Kwilt is guiding them, not handing them a standalone form.
- The agent may stream short setup/synthesis messages.
- User answers remain deterministic cards, not open-ended chat, except the required "Name it in a few words" text field.
- The composer must stay hidden while a structured survey card is active.
- Keep the current 5-step FTUX question model:
  1. `What kind of thing is it?`
  2. `Name it in a few words.`
  3. `What do you want to do with it?`
  4. `What matters most about it?`
  5. `Who is this helping you become?`
- The first card needs a lead-in because users may tap through the intro screens without deeply reading.

---

## Files

- Modify: `src/features/onboarding/IdentityAspirationFlow.tsx`
  - Re-enable the agent-timeline soft-start for `firstTimeOnboarding`.
  - Stream FTUX-specific lead-in copy.
  - Render the 5-step FTUX `SurveyCard` in the existing `AgentWorkspace` step-card slot.
  - Keep composer hidden through workflow step configuration.
- Modify if needed: `src/features/ai/workflows/firstTimeOnboardingWorkflow.ts`
  - Confirm `hideFreeformChatInput` is set on survey steps where the card is active.
- Modify if needed: `src/features/ai/AiChatScreen.tsx`
  - Only adjust if the composer appears during FTUX step-card rendering or keyboard behavior regresses.
- Modify: `src/domain/arcCreationSurvey.test.ts`
  - Keep the current survey-model tests green.
- Add or modify tests near onboarding if a suitable existing test harness exists:
  - Prefer a focused unit/renderer test that verifies first-time onboarding does not bypass the streamed intro before the survey card appears.

---

## Task 1: Restore FTUX Soft-Start Streaming

**Files:**
- Modify: `src/features/onboarding/IdentityAspirationFlow.tsx`

- [ ] **Step 1: Remove the first-time onboarding auto-bypass**

Find the effect that currently does this for `isFirstTimeOnboarding`:

```ts
workflowRuntime.completeStep('soft_start');
setIntroPlayed(true);
setHasSubmittedFirstTimeSurvey(false);
setHasStreamedDreamsIntroCopy(true);
shouldAutofocusDreamsRef.current = true;
setSurveyPhaseByIndex(0);
```

Delete that effect or change it so it no longer auto-completes `soft_start` for first-time onboarding.

- [ ] **Step 2: Let the existing streaming intro effect run for FTUX**

Find the intro streaming effect that currently starts with:

```ts
if (isFirstTimeOnboarding) return;
```

Remove that guard. Keep the rest of the effect so it streams through `chatControllerRef.current.streamAssistantReplyFromWorkflow(...)`.

- [ ] **Step 3: Use FTUX-specific lead-in copy**

Set `INTRO_MESSAGES` to one plain, short FTUX lead-in:

```ts
const INTRO_MESSAGES: string[] = isFirstTimeOnboarding
  ? [
      "Let's start broad. Pick the closest fit, then Kwilt will shape it into a first Goal and the bigger Arc underneath it.",
    ]
  : [
      'Start with one real thing you want to make progress on. Kwilt will turn it into a first **Goal** and the longer **Arc** it belongs inside.',
    ];
```

If this causes hook dependency churn, wrap it in `useMemo`:

```ts
const INTRO_MESSAGES = useMemo(
  () =>
    isFirstTimeOnboarding
      ? [
          "Let's start broad. Pick the closest fit, then Kwilt will shape it into a first Goal and the bigger Arc underneath it.",
        ]
      : [
          'Start with one real thing you want to make progress on. Kwilt will turn it into a first **Goal** and the longer **Arc** it belongs inside.',
        ],
  [isFirstTimeOnboarding]
);
```

- [ ] **Step 4: Keep the card hidden until the lead-in finishes**

Verify `AiChatScreen` still hides `stepCard` while `isAssistantTyping`:

```tsx
isAssistantTyping ? styles.stepCardHostHiddenWhileTyping : null
```

No code change is needed if this is still present.

- [ ] **Step 5: Run focused typecheck**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: exit 0.

---

## Task 2: Replace The Current FTUX Begin Behavior With A Timeline Begin

**Files:**
- Modify: `src/features/onboarding/IdentityAspirationFlow.tsx`

- [ ] **Step 1: Re-enable the soft-start action card for FTUX**

Find:

```ts
if (!isFirstTimeOnboarding && workflowRuntime?.instance?.currentStepId === 'soft_start' && !introPlayed) {
```

Change it to:

```ts
if (workflowRuntime?.instance?.currentStepId === 'soft_start' && !introPlayed) {
```

This restores the previous pattern: the agent streams a message, then an action card appears in the timeline.

- [ ] **Step 2: Update the action button copy**

Use the current FTUX CTA:

```tsx
<ButtonLabel size="md">
  {FTUX_GOAL_ARC_SURVEY_COPY.introCta}
</ButtonLabel>
```

Expected visible copy: `Start with one thing`.

- [ ] **Step 3: Make the synthetic user message match the CTA**

Update `handleBeginSurvey` from:

```ts
appendChatUserMessage('💪 Lets do it!');
```

to:

```ts
appendChatUserMessage(FTUX_GOAL_ARC_SURVEY_COPY.introCta);
```

Use no emoji. This avoids teen/adult voice ambiguity and keeps the timeline literal.

- [ ] **Step 4: Start the FTUX survey at the category card**

Inside `handleBeginSurvey`, keep:

```ts
setHasSubmittedFirstTimeSurvey(false);
setHasStreamedDreamsIntroCopy(true);
setSurveyPhaseByIndex(0);
```

Remove:

```ts
shouldAutofocusDreamsRef.current = true;
```

The first FTUX card is a choice set, so autofocus is not needed until the text question appears.

---

## Task 3: Ensure Composer Hidden During Structured Cards

**Files:**
- Inspect: `src/features/ai/workflows/firstTimeOnboardingWorkflow.ts`
- Inspect or modify: `src/features/ai/AiChatScreen.tsx`

- [ ] **Step 1: Verify the active workflow step hides freeform input**

Open `src/features/ai/workflows/firstTimeOnboardingWorkflow.ts` and confirm the survey-hosting step has:

```ts
hideFreeformChatInput: true,
```

If missing, add it to the `soft_start` step and the step that receives the completed survey payload.

- [ ] **Step 2: Verify AiChatPane composer rule still supports FTUX cards**

Confirm this logic remains:

```ts
const shouldHideComposerForWorkflowStep =
  Boolean(workflowRuntime && currentWorkflowStep?.hideFreeformChatInput);

const shouldShowComposer =
  !shouldHideComposerForWorkflowStep &&
  mode !== 'activityCreation' &&
  (!isOnboardingMode || !hasStepCard);
```

No change is needed if this is intact.

- [ ] **Step 3: Manual expected behavior**

When the lead-in bubble and survey card are visible:

- The composer should not appear.
- The user should only see the structured answer card.
- Tapping a single-choice non-custom option should advance to the next card.
- The only keyboard should appear on `Name it in a few words.`

---

## Task 4: Keep The New Question Set Intact

**Files:**
- Inspect: `packages/arc-survey/src/arcCreationSurvey.ts`
- Inspect: `src/features/onboarding/IdentityAspirationFlow.tsx`
- Test: `src/domain/arcCreationSurvey.test.ts`

- [ ] **Step 1: Confirm FTUX step order stays 5 steps**

Expected:

```ts
export const FTUX_GOAL_ARC_SURVEY_STEP_ORDER: FtuxGoalArcSurveyStepId[] = [
  'category',
  'concreteFocus',
  'goalShape',
  'motivation',
  'identityBridge',
];
```

- [ ] **Step 2: Confirm `renderFirstTimeSurvey` uses the FTUX options**

Expected option groups:

```ts
ftuxCategoryOptions
goalShapeOptions
ftuxMotivationOptions
identityBridgeOptions
```

Do not reintroduce first-run `resistanceOptions` or `practiceStyleOptions`.

- [ ] **Step 3: Confirm the submit payload still creates Goal + Arc context**

Expected submit path:

```ts
const input = buildFtuxGoalArcGenerationInput(response);
setOnboardingGoalDraft(input.goalDraft);
workflowRuntime?.completeStep('big_dream', {
  bigDream: input.prompt,
  ftuxGoalArcSurveyResponse: response,
  ftuxGoalArcSurveyAdditionalContext: input.additionalContext,
  ftuxGoalDraft: input.goalDraft,
});
appendChatUserMessage(input.prompt);
```

---

## Task 5: Visual And Interaction QA

**Files:**
- Runtime only.

- [ ] **Step 1: Start Metro**

Run:

```bash
npx expo start --clear
```

- [ ] **Step 2: Trigger FTUX from dev tools**

Use the in-app dev tools path the user has been using.

- [ ] **Step 3: Verify the transition**

Expected sequence:

1. Full-color FTUX screen 3 shows `Build your path forward`.
2. User taps `Let's begin`.
3. The app transitions into the Kwilt agent timeline surface.
4. A short assistant message visually streams in.
5. The action card/button appears after streaming, not before.
6. Tapping `Start with one thing` appends a user timeline message.
7. The first survey card appears in the timeline: `What kind of thing is it?`
8. Composer is absent.

- [ ] **Step 4: Verify Charlie path**

Choose:

```text
A skill or hobby
Tennis
Get better at it
I enjoy it
Someone who practices and improves
```

Expected:

- Minimal typing: only `Tennis`.
- No composer visible during choice cards.
- Keyboard appears only on the `Tennis` card.
- Generated goal draft title should be close to `Get better at Tennis`.
- Arc direction should not collapse to merely `Tennis`.

- [ ] **Step 5: Verify adult/service path**

Choose:

```text
Money or home
Financial independence
Get organized
It helps me care for or serve others
Someone who lives what matters
```

Expected:

- Copy does not feel teen-only.
- The choices still make sense for an adult.
- The Arc framing points toward identity/values, not only financial mechanics.

- [ ] **Step 6: Verify custom path**

Choose `Something else` on category.

Expected:

- Custom input appears inside the card.
- Composer remains hidden.
- Keyboard avoidance keeps input and card action usable.

---

## Task 6: Automated Verification

**Files:**
- Test: `src/domain/arcCreationSurvey.test.ts`
- Possible test: onboarding/AI workflow renderer tests if available.

- [ ] **Step 1: Run survey tests**

Run:

```bash
npm test -- --runInBand src/domain/arcCreationSurvey.test.ts
```

Expected: pass.

- [ ] **Step 2: Run full changed-file verification**

Run:

```bash
npm run verify:changed -- --run
```

Expected:

- Typecheck passes.
- Related Jest tests pass.
- Product lint has no errors.
- Architecture lint has no new errors.

---

## Done Criteria

- The full-color FTUX intro no longer drops into a standalone white form.
- The agent timeline hosts the survey cards.
- The agent lead-in visually streams before the first action/card.
- The composer is hidden for structured survey responses.
- The 5-step deterministic question set remains unchanged.
- Charlie's tennis path takes one typed answer and produces both a first Goal and identity Arc context.
- `npm run verify:changed -- --run` passes.
