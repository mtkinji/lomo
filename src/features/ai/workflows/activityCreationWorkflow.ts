import type { WorkflowDefinition } from '../../../domain/workflows';
import { ACTIVITY_CREATION_SYSTEM_PROMPT } from '../systemPrompts';

/**
 * Activity Creation workflow.
 *
 * This workflow helps users create small, concrete activities they can do
 * in the near term (today, this week, or this month).
 */
export const activityCreationWorkflow: WorkflowDefinition = {
  id: 'activityCreation', // Matches ChatMode
  label: 'To-do Coach',
  version: 1,
  chatMode: 'activityCreation',
  systemPrompt: ACTIVITY_CREATION_SYSTEM_PROMPT,
  tools: [],
  autoBootstrapFirstMessage: true,
  renderableComponents: ['InstructionCard'],
  outcomeSchema: {
    kind: 'activity_creation_outcome',
    fields: {
      prompt: 'string',
      timeHorizon: 'string',
      energyLevel: 'string?',
      constraints: 'string?',
      adoptedActivityTitles: 'string[]?',
    },
  },
  steps: [
    {
      id: 'context_collect',
      type: 'collect_fields',
      label: 'Collect context',
      fieldsCollected: ['prompt', 'timeHorizon', 'energyLevel', 'constraints'],
      promptTemplate:
        'Briefly acknowledge the focused goal or life area the host provides and restate that you will suggest a few concrete, near-term to-dos. Infer a reasonable time horizon and energy level from the context instead of asking the user to choose between "light" vs "focused" or specific durations. Only ask one very short clarifying question if their description is extremely vague or if they mention hard constraints that clearly change what you should propose. Keep this lightweight so you can move quickly into concrete recommendations.',
      validationHint:
        'Ensure there is at least a short free-text prompt describing the kind of progress the user wants to make and a rough time horizon.',
      nextStepId: 'agent_generate_activities',
    },
    {
      id: 'agent_generate_activities',
      type: 'agent_generate',
      label: 'Generate to-do suggestions',
      fieldsCollected: [],
      promptTemplate:
        "Given the user's context, any focused goal from the launch context, and the workspace snapshot of existing goals and to-dos, propose a small, diverse set of 3–5 concrete, bite-sized to-dos they could actually do in the stated time horizon. Start with 1–2 short sentences that anchor to the goal and recap the horizon/energy you are aiming for, then present a tidy bullet list where each item has: (a) a to-do title that could be used in the app, (b) an approximate time/energy label, (c) one short \"why this matters\" line, and (d) a 2–6 item checklist of steps that belong in a single work session. Prefer small, realistic steps over vague or massive projects, and avoid duplicating existing to-dos word-for-word.",
      validationHint:
        'To-dos should be specific, doable in a single sitting, and not simply restate existing to-dos verbatim unless the user explicitly wants to revisit something.',
      nextStepId: 'confirm_activities',
    },
    {
      id: 'confirm_activities',
      type: 'confirm',
      label: 'Confirm or edit to-dos',
      fieldsCollected: ['adoptedActivityTitles'],
      promptTemplate:
        'Help the user pick one to three to-dos to adopt right now. Encourage trimming or rephrasing suggestions so they feel light and realistic. Capture the titles of any to-dos the user explicitly chooses so the host app can create them.',
      validationHint:
        'Capture the final to-do titles the user confirms; leave the list empty if they decide not to adopt any yet.',
    },
  ],
};





