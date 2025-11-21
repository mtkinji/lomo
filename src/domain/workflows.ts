import type { ChatMode } from '../features/ai/chatRegistry';

// --- Launch context --------------------------------------------------------

export type LaunchSource =
  | 'firstTimeAppOpen'
  | 'todayScreen'
  | 'arcsList'
  | 'arcDetail'
  | 'goalDetail'
  | 'devTools'
  | 'standaloneCoach';

export type LaunchIntent =
  | 'firstTimeOnboarding'
  | 'arcCreation'
  | 'goalCreation'
  | 'freeCoach';

export type LaunchContextEntityRef =
  | { type: 'arc'; id: string }
  | { type: 'goal'; id: string }
  | { type: 'activity'; id: string };

export type LaunchContext = {
  source: LaunchSource;
  /**
   * High-level intent for why the agent was launched. This typically maps
   * to a ChatMode and/or workflow definition.
   */
  intent?: LaunchIntent;
  /**
   * Optional domain entity the workspace is anchored to – for example, the
   * Arc or Goal the user had focused when launching the agent.
   */
  entityRef?: LaunchContextEntityRef;
};

// --- Generic workflow primitives -------------------------------------------

export type WorkflowStepType = 'collect_fields' | 'agent_generate' | 'confirm';

export type WorkflowStep = {
  id: string;
  type: WorkflowStepType;
  /**
   * Optional human-readable label for analytics or admin tools.
   */
  label?: string;
  /**
   * The fields this step is responsible for collecting or populating.
   */
  fieldsCollected?: string[];
  /**
   * Free-form instructions or prompt template that describe what the agent
   * should accomplish in this step.
   */
  promptTemplate?: string;
  /**
   * Optional validation expression or description. For now this is a
   * human-readable string that can be baked into prompts; in a later
   * backend-backed workflow engine this can become executable logic.
   */
  validationHint?: string;
  /**
   * Next step to transition to when this step completes successfully.
   */
  nextStepId?: string;
  /**
   * For confirm-style steps, allow branching based on the user's decision.
   */
  nextStepOnConfirmId?: string;
  nextStepOnEditId?: string;
};

export type WorkflowDefinition = {
  id: string;
  label: string;
  version: number;
  /**
   * Optional linkage back to a ChatMode so prompts/tools can be tailored
   * for this workflow.
   */
  chatMode?: ChatMode;
  /**
   * JSON schema-like description of the expected final outcome. This is
   * intentionally loose for now so we can keep it on the client; a future
   * backend service can harden this into a real JSON Schema.
   */
  outcomeSchema?: Record<string, unknown>;
  steps: WorkflowStep[];
};

export type WorkflowInstanceStatus = 'idle' | 'in_progress' | 'completed' | 'cancelled';

export type WorkflowInstance = {
  id: string;
  definitionId: string;
  status: WorkflowInstanceStatus;
  currentStepId?: string;
  /**
   * Bag of step-level data the workflow has collected so far. Keys are
   * field identifiers defined in the workflow's outcome schema.
   */
  collectedData: Record<string, unknown>;
  /**
   * Optional final structured output once the workflow reaches a completed
   * state – for example, a proposed Arc or Goal draft.
   */
  outcome?: Record<string, unknown> | null;
};

// --- Concrete workflow definitions -----------------------------------------

export const FIRST_TIME_ONBOARDING_WORKFLOW_ID = 'first_time_onboarding_v1';

export const FIRST_TIME_ONBOARDING_WORKFLOW: WorkflowDefinition = {
  id: FIRST_TIME_ONBOARDING_WORKFLOW_ID,
  label: 'First-time onboarding',
  version: 1,
  chatMode: 'firstTimeOnboarding',
  outcomeSchema: {
    kind: 'first_time_profile',
    fields: {
      name: 'string',
      ageRange: 'enum[under-18,18-24,25-34,35-44,45-54,55-64,65-plus,prefer-not-to-say]',
      notifications: 'enum[enabled,disabled,undecided]',
      focusAreas: 'string[]',
      starterArcStrategy: 'enum[generate_from_answers,start_from_scratch,skip_for_now]',
    },
  },
  steps: [
    {
      id: 'welcome',
      type: 'collect_fields',
      label: 'Warm orientation',
      promptTemplate:
        'Briefly welcome the user to LOMO and explain that you will guide a few short steps.',
      validationHint: 'No fields expected; ensure tone is clear and reassuring.',
      nextStepId: 'profile_basics',
    },
    {
      id: 'profile_basics',
      type: 'collect_fields',
      label: 'Name and age',
      fieldsCollected: ['name', 'ageRange'],
      promptTemplate:
        'Ask for preferred name and age (or age range) so tone can adapt. Keep it one clear question.',
      validationHint: 'Name should be non-empty. Age range must be one of the allowed buckets.',
      nextStepId: 'notifications',
    },
    {
      id: 'notifications',
      type: 'collect_fields',
      label: 'Notifications',
      fieldsCollected: ['notifications'],
      promptTemplate:
        'Offer a gentle choice about enabling notifications for nudges. Respect skips gracefully.',
      validationHint: 'Value must be enabled, disabled, or undecided.',
      nextStepId: 'focus_areas',
    },
    {
      id: 'focus_areas',
      type: 'collect_fields',
      label: 'Focus areas',
      fieldsCollected: ['focusAreas'],
      promptTemplate:
        'Ask which domains of life feel most alive or unsettled (health, work, relationships, spirituality, creativity, etc.).',
      validationHint: 'Expect at least one selected area unless the user explicitly skips.',
      nextStepId: 'starter_arc_decision',
    },
    {
      id: 'starter_arc_decision',
      type: 'collect_fields',
      label: 'Starter Arc decision',
      fieldsCollected: ['starterArcStrategy'],
      promptTemplate:
        'Offer a choice between generating a starter Arc from answers or starting from scratch.',
      validationHint:
        'Value must be generate_from_answers, start_from_scratch, or skip_for_now.',
      nextStepId: 'closing',
    },
    {
      id: 'closing',
      type: 'collect_fields',
      label: 'Closing',
      promptTemplate:
        'Congratulate the user, briefly summarize what is now configured, and remind them they can ask for help with Arcs, Goals, and Chapters anytime.',
      validationHint: 'No new fields; keep closing concise and encouraging.',
    },
  ],
};

export const ARC_CREATION_WORKFLOW_ID = 'arc_creation_v1';

export const ARC_CREATION_WORKFLOW: WorkflowDefinition = {
  id: ARC_CREATION_WORKFLOW_ID,
  label: 'Arc creation',
  version: 1,
  chatMode: 'arcCreation',
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
      label: 'Collect context',
      fieldsCollected: ['prompt', 'timeHorizon', 'constraints'],
      promptTemplate:
        'Ask where the user is most hungry for change right now and what time horizon they care about (e.g., next month vs this year). Keep it light and concrete.',
      validationHint:
        'Ensure there is at least a short free-text prompt describing the user’s hunger for change.',
      nextStepId: 'agent_generate_arc',
    },
    {
      id: 'agent_generate_arc',
      type: 'agent_generate',
      label: 'Generate Arc suggestions',
      fieldsCollected: [],
      promptTemplate:
        'Given the user’s context and any existing workspace snapshot, propose 1–3 Arc identity directions that feel distinctive and grounded.',
      validationHint:
        'Arcs should read like long-horizon identity directions, not single projects.',
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

export const WORKFLOW_DEFINITIONS: Record<string, WorkflowDefinition> = {
  [FIRST_TIME_ONBOARDING_WORKFLOW_ID]: FIRST_TIME_ONBOARDING_WORKFLOW,
  [ARC_CREATION_WORKFLOW_ID]: ARC_CREATION_WORKFLOW,
};



