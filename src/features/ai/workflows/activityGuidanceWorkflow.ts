import type { WorkflowDefinition } from '../../../domain/workflows';
import { ACTIVITY_GUIDANCE_SYSTEM_PROMPT } from '../systemPrompts';

/**
 * Activity Guidance workflow.
 *
 * This is a lightweight, no-card workflow that auto-bootstraps a first
 * assistant reply when the user opens chat from an Activity detail context.
 */
export const activityGuidanceWorkflow: WorkflowDefinition = {
  id: 'activityGuidance', // Matches ChatMode
  label: 'Activity Guidance',
  version: 1,
  chatMode: 'activityGuidance',
  systemPrompt: ACTIVITY_GUIDANCE_SYSTEM_PROMPT,
  tools: [],
  autoBootstrapFirstMessage: true,
  renderableComponents: [],
  outcomeSchema: {
    kind: 'activity_guidance_outcome',
    fields: {},
  },
  steps: [
    {
      id: 'guide',
      type: 'agent_generate',
      label: 'Offer guidance',
      fieldsCollected: [],
      promptTemplate:
        'Produce a 1–2 sentence opening that asks how you can help with the focused Activity, then output an AGENT_OFFERS_JSON block with 3–5 selectable offers tailored to the Activity. Include an offer for breaking the activity into smaller scheduled chunks on the calendar.',
      validationHint:
        'Ensure advice references the focused activity and stays concrete and actionable.',
    },
  ],
};


