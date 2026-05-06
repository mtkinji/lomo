# Arc and Goal Creation Survey Questions

This file lists the current user-facing questions we ask during Arc creation and Goal creation.

It is meant to be a simple reference, not a product spec.

## Arc creation

Source of truth:
- [packages/arc-survey/src/arcCreationSurvey.ts](/Users/andrewwatanabe/Kwilt/packages/arc-survey/src/arcCreationSurvey.ts:1)

These questions are used in both:
- first-time onboarding Arc creation
- regular Arc creation

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
