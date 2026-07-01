# Arc and Goal Creation Survey Questions

This file lists the current user-facing questions we ask during Arc creation and Goal creation.

It is meant to be a simple reference, not a product spec.

For the broader product direction, see [Object Creation UX System](feature-briefs/object-creation-ux-system.md). The current decision is that FTUX, direct Goal creation, and direct Arc creation should share a creation grammar even when they expose different numbers of questions.

## Shared creation grammar

1. Focus - what the user can name right now.
2. Goal shape - what near-term progress should look like.
3. Meaning - what matters most about the focus.
4. Identity bridge - who this helps the user become.
5. Resistance - where it usually gets hard.
6. Support style - what kind of help should fit the user.

FTUX uses an activation-first subset because it creates both the first Goal and the first Arc without blocking first value. Later direct Goal creation should probably use an even shorter guided subset. Direct Arc creation may need identity-first and activity-to-identity starts.

## FTUX Goal+Arc creation

Source of truth:
- [packages/arc-survey/src/arcCreationSurvey.ts](/Users/andrewwatanabe/Kwilt/packages/arc-survey/src/arcCreationSurvey.ts:1)

These questions are used during first-time onboarding to create both a concrete first Goal and the identity Arc it belongs inside.

1. `What kind of thing is it?`

2. `Name it in a few words.`
   Placeholder: `Tennis, sleep, school, prayer...`

3. `What do you want to do with it?`

4. `What matters most about it?`

5. `Who is this helping you become?`

Deferred until after first payoff: `What usually gets in the way?` and `What would help you keep going?`

## Arc creation

Source of truth:
- [packages/arc-survey/src/arcCreationSurvey.ts](/Users/andrewwatanabe/Kwilt/packages/arc-survey/src/arcCreationSurvey.ts:1)

These questions are historical/direct Arc creation reference. First-time onboarding now uses the FTUX Goal+Arc creation sequence above.

### Current Arc survey questions

1. `Looking ahead, what’s one big thing you’d love to bring to life?`
   Placeholder: `e.g., Be a calmer, more patient dad; build a lifestyle software business; rewild our back acreage into a native meadow.`

2. `Why does this feel important to you right now? (Optional)`

3. `Which part of yourself are you most excited to grow right now?`

4. `On a normal day in that future—not a big moment—what could you do that would make you feel quietly proud of yourself?`

5. `What do you think would motivate future you the most here?`

6. `What kind of people do you look up to?`

7. `What qualities do you admire in them? (Pick 1–3)`

### Notes

- The `Why does this feel important to you right now?` step is intentionally skippable.
- In code, the canonical Arc step order is:
  - `dreams`
  - `whyNow`
  - `domain`
  - `proudMoment`
  - `motivation`
  - `roleModelType`
  - `admiredQualities`

## Goal creation

Source of truth:
- [src/features/goals/GoalCreationFlow.tsx](/Users/andrewwatanabe/Kwilt/src/features/goals/GoalCreationFlow.tsx:105)
- [src/features/ai/workflows/goalCreationWorkflow.ts](/Users/andrewwatanabe/Kwilt/src/features/ai/workflows/goalCreationWorkflow.ts:1)

Goal creation is lighter than Arc creation. It starts with a choice, then uses a short 2-step form if the user chooses to describe the goal manually.

### Current Goal creation entry choice

Prompt shown in chat:

`How would you like to create your goal?`

Buttons:
- `Recommend a goal`
- `Describe my goal`

### Current Goal creation form questions

1. `What do you want to achieve?`
   Placeholder: `e.g., Finish the first draft of my novel; Run a 5K; Launch my side project.`

2. `When do you want to achieve this?`
   Placeholder: `e.g., by next month, in 3 weeks, by March 15`
   Helper text: `Optional — leave blank if you're not sure yet.`

### Internal workflow wording

The workflow-level instruction for goal creation is slightly broader than the visible form copy. Internally, the system instructs the agent to ask:

`what they want to make progress on and what timeframe they intend`

with examples like:
- `tomorrow`
- `this weekend`
- `next month`
- `next 90 days`

This is not a separate visible survey screen today. It is the workflow intent behind the 2-step goal form.
