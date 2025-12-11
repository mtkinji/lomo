import type { WorkflowDefinition, WorkflowStep } from '../../../domain/workflows';
import { ARC_CREATION_SYSTEM_PROMPT } from '../systemPrompts';

/**
 * Arc Creation workflow.
 *
 * This workflow helps users create a long-term identity Arc by collecting
 * context about their desired future self and proposing Arc directions.
 */
export const arcCreationWorkflow: WorkflowDefinition = {
  id: 'arcCreation', // Matches ChatMode
  label: 'Arc Coach',
  version: 1,
  chatMode: 'arcCreation',
  systemPrompt: ARC_CREATION_SYSTEM_PROMPT,
  tools: [
    {
      id: 'generateArcs',
      description:
        "Analyze the user's longings, time horizon, and constraints to propose 2–3 identity Arcs.",
      kind: 'internal_ai',
      serverOperation: 'ai.generateArcs',
    },
    {
      id: 'adoptArc',
      description:
        "Take a suggested Arc (name, north star, narrative, status) and create it in the user's workspace.",
      kind: 'internal_store',
      serverOperation: 'arc.createFromSuggestion',
    },
  ],
  autoBootstrapFirstMessage: false,
  renderableComponents: ['InstructionCard'],
  outcomeSchema: {
    kind: 'arc_creation_outcome',
    fields: {
      prompt: 'string',
      timeHorizon: 'string',
      constraints: 'string?',
      adoptedArcId: 'string?',
    },
  },
  steps: [
    {
      id: 'context_collect',
      type: 'collect_fields',
      label: 'Collect free-text Arc desire',
      fieldsCollected: ['prompt'],
      hideFreeformChatInput: true,
      promptTemplate:
        'Invite the user to describe, in their own words, one thing they would like to make progress on or change in their life right now. This should feel like a low-pressure journaling prompt, not a formal goal statement.',
      validationHint:
        'Ensure there is at least a short free-text description of what they want to move forward.',
      nextStepId: 'agent_generate_arc',
    },
    {
      id: 'agent_generate_arc',
      type: 'agent_generate',
      label: 'Generate Arc suggestions',
      fieldsCollected: [],
      promptTemplate:
        "Given the user's context and any existing workspace snapshot, propose 1–3 Arc identity directions that feel distinctive and grounded.",
      validationHint:
        'Arcs should read like long-horizon identity directions, not single projects.',
      agentBehavior: {
        loadingMessage:
          "Got it — I’m shaping a first-pass Arc that fits this dream and stays broad enough to hold many future projects. Once it’s ready, we can tweak the name or narrative together.",
        loadingMessageId: 'assistant-arc-status',
      },
      nextStepId: 'confirm_arc',
    },
    {
      id: 'confirm_arc',
      type: 'confirm',
      label: 'Confirm or edit Arc',
      fieldsCollected: ['adoptedArcId'],
      promptTemplate:
        'Help the user decide whether to adopt one Arc, edit it, or try a different direction. Keep the decision clear and low-pressure.',
      validationHint:
        'Capture which Arc (if any) the user adopted so the client can persist it, or leave null if they chose not to adopt yet.',
    },
  ],
};


