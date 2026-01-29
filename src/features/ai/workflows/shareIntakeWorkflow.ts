import type { WorkflowDefinition } from '../../../domain/workflows';

/**
 * Share Intake workflow.
 *
 * Purpose: launched from iOS Share Extension. The user chooses what they want to create:
 * - Arc, Goal, Activity, or a chained "All" flow.
 *
 * This workflow does not call the LLM; it is driven by a step card presenter.
 */
export const shareIntakeWorkflow: WorkflowDefinition = {
  id: 'shareIntake', // Matches ChatMode
  label: 'Share Intake',
  version: 1,
  chatMode: 'shareIntake',
  // Required by workflow validation; not used because this workflow never invokes the agent.
  systemPrompt:
    'You are the Kwilt coach. Help the user turn shared content into an Arc, Goal, or Activity. Keep the flow lightweight.',
  tools: [],
  autoBootstrapFirstMessage: false,
  renderableComponents: ['InstructionCard'],
  outcomeSchema: {
    kind: 'share_intake_outcome',
    fields: {
      createKinds: 'string[]', // ['arc'|'goal'|'activity']
    },
  },
  steps: [
    {
      id: 'intent_pick',
      type: 'collect_fields',
      label: 'Choose what to create',
      fieldsCollected: ['createKinds'],
      // Rendered by a step-card presenter; keep global chat input hidden.
      hideFreeformChatInput: true,
      // Terminal step: completing it ends the workflow and triggers host `onComplete`.
    },
  ],
};


