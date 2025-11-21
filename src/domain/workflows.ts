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
export const FIRST_TIME_ONBOARDING_WORKFLOW_V2_ID = 'first_time_onboarding_v2';

/**
 * Existing v1 onboarding workflow. Still used by the current
 * OnboardingGuidedFlow implementation while we gradually migrate to
 * the more goal/arc/activity-oriented FTUE.
 */
export const FIRST_TIME_ONBOARDING_WORKFLOW: WorkflowDefinition = {
  id: FIRST_TIME_ONBOARDING_WORKFLOW_ID,
  label: 'First-time onboarding (v1)',
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

/**
 * Planned v2 onboarding workflow that follows the Goal → Arc → Activities
 * narrative. This is not yet wired into the UI; it serves as the contract
 * for future OnboardingGuidedFlow updates and for a backend workflow engine.
 */
export const FIRST_TIME_ONBOARDING_WORKFLOW_V2: WorkflowDefinition = {
  id: FIRST_TIME_ONBOARDING_WORKFLOW_V2_ID,
  label: 'First-time onboarding (v2 – goal, arc, activities)',
  version: 2,
  chatMode: 'firstTimeOnboarding',
  outcomeSchema: {
    kind: 'first_time_onboarding_v2',
    fields: {
      name: 'string',
      age: 'number',
      desireSummary: 'string',
      goal: {
        title: 'string',
        why: 'string',
        timeHorizon: 'string',
      },
      arc: {
        name: 'string',
        description: 'string',
      },
      activities: 'array[activity]',
      avatarUrl: 'string?',
      notifications: 'enum[enabled,disabled]',
    },
  },
  steps: [
    {
      id: 'welcome_orientation',
      type: 'collect_fields',
      label: 'Welcome & priming',
      promptTemplate:
        'Briefly welcome the user to TAKADO, explain that this is a short guided setup, and set a calm, grounded tone. Emphasize that you will help them clarify one goal, the Arc (chapter) it lives inside, and a few simple starting steps.',
      validationHint: 'No fields collected; keep the message short, warm, and specific about what will happen.',
      nextStepId: 'identity_basic',
    },
    {
      id: 'identity_basic',
      type: 'collect_fields',
      label: 'Basic identity',
      fieldsCollected: ['name', 'age'],
      promptTemplate:
        'Ask first for preferred name (“What should I call you?”). Once they answer, follow up with age (“And how old are you?”). Explain that this helps you tune tone and examples.',
      validationHint:
        'Name should be non-empty. Age should be a reasonable integer; if unclear, ask once for clarification and then move on.',
      nextStepId: 'desire_invite',
    },
    {
      id: 'desire_invite',
      type: 'collect_fields',
      label: 'Invite a desire',
      fieldsCollected: ['desireSummary'],
      promptTemplate:
        'Invite the user to share something they would like to make progress on right now. Keep it low-pressure and open: anything that matters to them is valid.',
      validationHint:
        'Expect a short free-text summary. If the user is unsure, offer 2–3 example categories like “health”, “creative work”, or “relationships”.',
      nextStepId: 'desire_clarify',
    },
    {
      id: 'desire_clarify',
      type: 'collect_fields',
      label: 'Clarify intention',
      fieldsCollected: ['desireClarified'],
      promptTemplate:
        'Read the user’s desireSummary and ask ONE targeted clarifying question that helps you understand what matters most. Examples: “What part of that feels most important right now?” or “Is this more about developing a habit, learning something, or making a specific change?”',
      validationHint:
        'Only one follow-up question. Capture a short clarified summary or key phrase that will feed the goal draft.',
      nextStepId: 'goal_draft',
    },
    {
      id: 'goal_draft',
      type: 'agent_generate',
      label: 'Draft goal formation',
      fieldsCollected: ['goal'],
      promptTemplate:
        'Synthesize a simple, concrete goal from the user’s desire and clarified intention. Produce a title, a short “why it matters”, and a rough time horizon (30–90 days). Prepare copy to accompany a GoalDraftCard where the user can edit title, why, and time horizon.',
      validationHint:
        'Goal should feel doable within ~30–90 days, specific but not overwhelming. Use the user’s own language where possible.',
      nextStepId: 'goal_confirm',
    },
    {
      id: 'goal_confirm',
      type: 'collect_fields',
      label: 'Goal confirmation',
      fieldsCollected: ['goalConfirmed'],
      promptTemplate:
        'Once the user accepts or edits the goal in the UI, briefly acknowledge it and confirm you will use this as their first goal.',
      validationHint: 'No additional data; just confirm and reflect the goal back in natural language.',
      nextStepId: 'arc_introduce',
    },
    {
      id: 'arc_introduce',
      type: 'collect_fields',
      label: 'Introduce Arcs',
      promptTemplate:
        'Explain briefly that every goal in TAKADO lives inside an Arc, the broader chapter of life it belongs to. Set up the next identity-oriented questions.',
      validationHint:
        'No fields; keep it short and avoid jargon. Make Arcs feel like a natural container, not a technical concept.',
      nextStepId: 'arc_identity_primary',
    },
    {
      id: 'arc_identity_primary',
      type: 'collect_fields',
      label: 'Arc identity prompt',
      fieldsCollected: ['arcIdentityRaw'],
      promptTemplate:
        'Ask: “When you imagine the version of yourself who reaches this goal, what kind of person are they becoming?” Capture their free-form answer.',
      validationHint:
        'Answer may be short; do not force depth. This is raw material for the Arc name and description.',
      nextStepId: 'arc_identity_clarify',
    },
    {
      id: 'arc_identity_clarify',
      type: 'collect_fields',
      label: 'Arc clarifying prompt',
      fieldsCollected: ['arcIdentityClarified'],
      promptTemplate:
        'Based on arcIdentityRaw, ask ONE follow-up question about what feels most important in that identity shift. Example: “What about that feels most important to you?”',
      validationHint:
        'Single follow-up only. Capture a short clarified phrase or bullet that highlights the core value or direction.',
      nextStepId: 'arc_draft',
    },
    {
      id: 'arc_draft',
      type: 'agent_generate',
      label: 'Draft Arc formation',
      fieldsCollected: ['arc'],
      promptTemplate:
        'Propose an identity-based Arc that the goal fits inside. Produce an Arc name, a one-sentence description, and a short explanation tying the Arc to the current goal. This will populate an ArcDraftCard where the user can edit name/description.',
      validationHint:
        'Arc name should be identity-oriented and durable (a chapter), not a task. Description should be one grounded sentence.',
      nextStepId: 'arc_confirm',
    },
    {
      id: 'arc_confirm',
      type: 'collect_fields',
      label: 'Arc confirmation',
      fieldsCollected: ['arcConfirmed'],
      promptTemplate:
        'Once the user accepts or edits the Arc in the UI, briefly acknowledge it and confirm this will be the chapter guiding their direction.',
      validationHint:
        'No new structured fields; simply mark that the Arc has been adopted and reflect it back in natural language.',
      nextStepId: 'activities_generate',
    },
    {
      id: 'activities_generate',
      type: 'agent_generate',
      label: 'Generate starter activities',
      fieldsCollected: ['activities'],
      promptTemplate:
        'Given the confirmed goal and Arc, propose 2–4 small, clear starter Activities that build early momentum. Each should be concrete and doable (e.g., “Take a 10-minute walk today”). Prepare copy to accompany an ActivityListCard where the user can accept all, select some, ask for different options, or skip.',
      validationHint:
        'Activities should feel like next steps, not projects. Avoid overloading the user; keep the list short.',
      nextStepId: 'activities_confirm',
    },
    {
      id: 'activities_confirm',
      type: 'collect_fields',
      label: 'Activities confirmation',
      fieldsCollected: ['activitiesSelection'],
      promptTemplate:
        'Acknowledge whichever Activities the user chose to add (or that they skipped for now), and briefly summarize that these are now part of their plan.',
      validationHint:
        'No new structured activities here; just record which ones the user adopted so the client can persist them.',
      nextStepId: 'profile_avatar',
    },
    {
      id: 'profile_avatar',
      type: 'collect_fields',
      label: 'Profile personalization',
      fieldsCollected: ['avatarUrl'],
      promptTemplate:
        'Offer the option to add a photo or avatar before they begin, and gracefully accept skips.',
      validationHint:
        'avatarUrl may be null. Do not pressure the user; this is optional seasoning, not a requirement.',
      nextStepId: 'notifications_v2',
    },
    {
      id: 'notifications_v2',
      type: 'collect_fields',
      label: 'Notifications setup',
      fieldsCollected: ['notifications'],
      promptTemplate:
        'Offer a simple choice to turn on gentle notifications for steps and Arc attention, or “Not now”.',
      validationHint:
        'notifications should be enabled or disabled. Respect the user’s choice without pushing.',
      nextStepId: 'closing_v2',
    },
    {
      id: 'closing_v2',
      type: 'collect_fields',
      label: 'Closing (goal, arc, activities)',
      promptTemplate:
        'Congratulate the user by name, briefly recap that they now have an Arc, a goal, and a few concrete next steps, and remind them they can ask what to do next at any time.',
      validationHint:
        'No new fields; keep it concise, encouraging, and grounded. Avoid hype.',
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
  [FIRST_TIME_ONBOARDING_WORKFLOW_V2_ID]: FIRST_TIME_ONBOARDING_WORKFLOW_V2,
  [ARC_CREATION_WORKFLOW_ID]: ARC_CREATION_WORKFLOW,
};



