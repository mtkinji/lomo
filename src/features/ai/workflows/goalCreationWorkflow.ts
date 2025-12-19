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
  version: 2,
  chatMode: 'goalCreation',
  systemPrompt: GOAL_CREATION_SYSTEM_PROMPT,
  tools: [],
  // Goal creation opens with a workflow-driven step card (Arc pick + prompt capture).
  // Do not auto-bootstrap an LLM message on mount or we end up with competing intros.
  autoBootstrapFirstMessage: false,
  renderableComponents: ['InstructionCard'],
  outcomeSchema: {
    kind: 'goal_creation_outcome',
    fields: {
      arcId: 'string?',
      prompt: 'string',
      constraints: 'string?',
      title: 'string',
      description: 'string?',
      status: 'string',
      forceIntent: 'Record<string, 0 | 1 | 2 | 3>',
    },
  },
  steps: [
    {
      id: 'arc_select',
      type: 'collect_fields',
      label: 'Pick an Arc (optional)',
      fieldsCollected: ['arcId'],
      promptTemplate:
        'Ask which Arc the user wants this goal to live in. They can skip and choose later.',
      validationHint:
        'If an Arc is selected, capture its id; otherwise leave it null/empty so the user can pick later when adopting.',
      hideFreeformChatInput: true,
      nextStepId: 'context_collect',
    },
    {
      id: 'context_collect',
      type: 'collect_fields',
      label: 'Collect prompt',
      fieldsCollected: ['prompt', 'constraints'],
      promptTemplate:
        'Ask the user (in one short question) what they want to make progress on over the next 30–90 days. Optionally, if needed, ask at most one short follow-up about constraints.',
      validationHint:
        'Ensure there is at least a short free-text prompt describing the kind of progress the user wants. Constraints are optional.',
      hideFreeformChatInput: false,
      nextStepId: 'agent_generate_goals',
    },
    {
      id: 'agent_generate_goals',
      type: 'agent_generate',
      label: 'Generate goal options',
      fieldsCollected: [],
      promptTemplate:
        "Given the user's Arc choice (if any), focused Arc (if launched from Arc detail), and workspace snapshot, propose exactly ONE candidate goal with a title and short description. If you include a timeframe, weave it into the description rather than as a separate field.",
      validationHint:
        'Produce exactly one concrete, realistic 30–90 day goal that does not duplicate existing goals verbatim.',
      agentBehavior: {
        loadingMessage:
          'Got it — I’m shaping one concrete 30–90 day goal that fits this season and the Arc you’re working from. Once it’s ready, you can accept it as-is or tweak the wording.',
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


