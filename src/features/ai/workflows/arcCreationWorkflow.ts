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
        "Analyze the user's context and generate ONE identity Arc proposal (name + narrative).",
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
      label: 'Generate Arc proposal',
      fieldsCollected: [],
      promptTemplate:
        [
          "Given the user's collected survey answers, propose exactly ONE Arc identity direction.",
          '',
          "The proposal should feel like one direction of becoming, not the user's entire life plan.",
          'Do not provide multiple Arc options.',
          'Do not make the Arc collapse into a single project, even if the user mentioned a concrete project.',
          '',
          'The proposal narrative should be exactly 3 sentences:',
          '1. Start with "You are becoming..." and name the identity trajectory.',
          '2. Name the central insight, tension, or why this matters.',
          '3. Name 1-3 concrete ordinary-day behaviors that would make progress visible.',
          '',
          'Keep the card light enough to adopt quickly on mobile. Prefer short, clear sentences over packed compound sentences.',
          'Avoid parenthetical lists.',
          'Avoid semicolon-heavy or comma-stacked sentences that read like compressed essays.',
          'Do not use loaded phrases like "reaching for escape" unless the user used similar language; prefer gentler wording like "reaching for distraction" or "drifting into avoidance".',
          'Do not use short-horizon goal language like "this week", "today", "next step", "focus block", or "outcome" unless the user explicitly wrote it.',
          'Do not turn the Arc into a productivity system or task-management plan.',
          '',
          'If multiple user signals compete, prioritize identity direction, primary arena, ordinary-day progress, drift pattern, then tone preferences.',
          'Tone preferences are optional flavor, not required content. Use them only when they naturally strengthen the Arc.',
          'If the user selects include_faith, faith may be treated as a source of grounding, meaning, or return, but do not make theological claims or over-spiritualize the Arc.',
          'If the user selects include_creative_work but the primary arena is not creative work, do not make creative work the main endpoint. Mention it only if it naturally fits.',
          '',
          'The Arc name should name a person-in-formation, not an activity, job title, category, or process.',
          'Avoid names like "Creative Shipping", "Creative Entrepreneur", "Personal Growth", or "Productivity".',
          'Avoid functional operator names like "The Prioritizer", "The Optimizer", "The Executor", "The Planner", or "The Achiever".',
          'For focus/prioritization inputs, prefer human names like "The Steady Keeper", "The Clear Keeper", "The Grounded Steward", or "The Focused Builder".',
          '',
          'Return only the required ARC_PROPOSAL_JSON block. Do not include a visible explanation before or after it; the proposal card should speak for itself.',
        ].join('\n'),
      validationHint:
        'Arcs should read like identity trajectories with ordinary-life behavioral evidence, not single projects or generic aspirations.',
      agentBehavior: {
        loadingMessage:
          "I'm shaping one Arc from your answers — broad enough to grow with you, concrete enough to act on.",
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


