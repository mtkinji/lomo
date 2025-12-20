import type { WorkflowDefinition, WorkflowStep } from '../../../domain/workflows';
import { GOAL_CREATION_SYSTEM_PROMPT } from '../systemPrompts';

/**
 * Goal Creation workflow.
 *
 * This workflow helps users create a single, clear goal that matches their intended time horizon.
 * It can be launched from the Goals page or from within an Arc detail screen.
 */
export const goalCreationWorkflow: WorkflowDefinition = {
  id: 'goalCreation', // Matches ChatMode
  label: 'Goal Coach',
  version: 2,
  chatMode: 'goalCreation',
  systemPrompt: GOAL_CREATION_SYSTEM_PROMPT,
  tools: [],
  // Goal creation opens with a workflow-driven presenter that streams a short intro
  // into the chat timeline. We intentionally do not auto-bootstrap an LLM message.
  autoBootstrapFirstMessage: false,
  renderableComponents: ['InstructionCard'],
  outcomeSchema: {
    kind: 'goal_creation_outcome',
    fields: {
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
      id: 'context_collect',
      type: 'collect_fields',
      label: 'Collect prompt',
      fieldsCollected: ['prompt', 'constraints'],
      promptTemplate:
        "Ask the user (in one short question) what they want to make progress on and what timeframe they intend (e.g., tomorrow / this weekend / next month / next 90 days). If the user already stated a clear timeframe, do not ask again. Optionally, if needed, ask at most one short follow-up about constraints.",
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
        [
          'Given the focused Arc (if launched from Arc detail) and workspace snapshot, propose exactly ONE candidate goal.',
          '',
          'Also suggest which existing Arc this goal should belong to:',
          '- Use EXACTLY an existing Arc name from the workspace snapshot for "suggestedArcName".',
          '- If no Arc is a clear fit, set "suggestedArcName" to null.',
          '- Never invent a new Arc name in this field.',
          '',
          'IMPORTANT: The proposal card IS the confirmation UI. Do not ask a follow-up like “Do you want to adopt this?”',
          'Return a short human lead-in (0–2 sentences), then include the required GOAL_PROPOSAL_JSON payload at the end of the message.',
          '',
          'Format:',
          'GOAL_PROPOSAL_JSON: {',
          '  "title": "…",',
          '  "description": "…",',
          '  "status": "planned" | "in_progress",',
          '  "suggestedArcName": "Existing Arc name" | null,',
          '  "forceIntent": { "<forceId>": 0|1|2|3, ... },',
          '}',
          '',
          'Guidance:',
          "- The description should include a clear definition of done and an implied timeframe that matches the user's intent (no separate timeframe field needed).",
          '- Use the workspace snapshot to avoid duplicating existing goals/activities verbatim.',
          '- Do NOT use markdown fences around the JSON.',
        ].join('\n'),
      validationHint:
        "Produce exactly one concrete, realistic goal that matches the user's intended timeframe and does not duplicate existing goals verbatim.",
      agentBehavior: {
        loadingMessage:
          "Got it — I’m shaping one concrete goal that matches the timeframe you described. Once it’s ready, you can accept it as-is or tweak the wording.",
        loadingMessageId: 'assistant-goal-status',
      },
      // IMPORTANT: The host app confirms adoption via the proposal card UI, so we do not
      // advance into a separate LLM "confirm" step that can cause redundant confirmation turns.
    },
  ],
};


