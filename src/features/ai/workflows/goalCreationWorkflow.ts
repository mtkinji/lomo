import type { WorkflowDefinition, WorkflowStep } from '../../../domain/workflows';
import { GOAL_CREATION_SYSTEM_PROMPT } from '../systemPrompts';

/**
 * Goal Creation workflow.
 *
 * This workflow helps users create a single, clear goal for the next 30–90 days.
 * It can be launched from the Goals page or from within an Arc detail screen.
 */
export const goalCreationWorkflow: WorkflowDefinition = {
  id: 'goalCreation', // Matches ChatMode
  label: 'Goal Coach',
  version: 1,
  chatMode: 'goalCreation',
  systemPrompt: GOAL_CREATION_SYSTEM_PROMPT,
  tools: [],
  autoBootstrapFirstMessage: true,
  renderableComponents: ['InstructionCard'],
  outcomeSchema: {
    kind: 'goal_creation_outcome',
    fields: {
      prompt: 'string',
      timeHorizon: 'string?',
      constraints: 'string?',
      title: 'string',
      description: 'string?',
      status: 'string',
      forceIntent: 'Record<string, 0 | 1 | 2 | 3>',
    },
  },
  steps: [
    {
      id: 'context_collect',
      type: 'collect_fields',
      label: 'Collect context',
      fieldsCollected: ['prompt', 'timeHorizon', 'constraints'],
      promptTemplate:
        'Briefly clarify what the user wants to make progress on over the next 30–90 days and, if needed, infer a rough time horizon. Keep this light and concrete so you can move quickly into goal options.',
      validationHint:
        'Ensure there is at least a short free-text prompt describing the kind of progress the user wants and a rough time horizon.',
      nextStepId: 'agent_generate_goals',
    },
    {
      id: 'agent_generate_goals',
      type: 'agent_generate',
      label: 'Generate goal options',
      fieldsCollected: [],
      promptTemplate:
        "Given the user's context and any focused Arc or workspace snapshot, propose 1–3 candidate goals with titles, short descriptions, and natural-language time horizons.",
      validationHint:
        'Goals should be concrete, realistic over 30–90 days, and not simply restate existing goals verbatim.',
      agentBehavior: {
        loadingMessage:
          'Got it — I’m shaping a few concrete 30–90 day goals that fit this season and the Arc you’re working from. Once they’re ready, you can accept one as-is or tweak the wording.',
        loadingMessageId: 'assistant-goal-status',
      },
      nextStepId: 'confirm_goal',
    },
    {
      id: 'confirm_goal',
      type: 'confirm',
      label: 'Confirm or refine goal',
      fieldsCollected: ['title', 'description', 'status', 'forceIntent'],
      promptTemplate:
        'Help the user pick or refine one goal that feels like the right next 30–90 day focus. Capture the final goal title, short description, lifecycle status, and a simple 0–3 level sketch for each force so the host app can create it.',
      validationHint:
        'Capture exactly one goal draft the user feels good about adopting now; leave fields empty if they decide not to adopt yet.',
    },
  ],
};


