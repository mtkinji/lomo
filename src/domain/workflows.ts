import type { ChatMode } from '../features/ai/chatRegistry';
import {
  FIRST_TIME_ONBOARDING_V2_SPEC,
  type WorkflowSpec as FirstTimeOnboardingWorkflowSpec,
  type StepSpec as FirstTimeOnboardingStepSpec,
} from './workflowSpecs/firstTimeOnboardingV2Spec';

// --- Launch context --------------------------------------------------------

export type LaunchSource =
  | 'firstTimeAppOpen'
  | 'todayScreen'
  | 'arcsList'
  | 'activitiesList'
  | 'arcDetail'
  | 'goalDetail'
  | 'activityDetail'
  | 'chapterDetail'
  | 'devTools'
  | 'standaloneCoach';

export type LaunchIntent =
  | 'firstTimeOnboarding'
  | 'arcCreation'
  | 'goalCreation'
  | 'activityCreation'
  | 'freeCoach'
  | 'arcEditing'
  | 'goalEditing'
  | 'activityEditing'
  | 'editField';

export type LaunchContextEntityRef =
  | { type: 'arc'; id: string }
  | { type: 'goal'; id: string }
  | { type: 'activity'; id: string };

export type LaunchContextObjectType = 'arc' | 'goal' | 'activity' | 'chapter';

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
  /**
   * Optional richer context for inline edit flows. These fields intentionally
   * stay lightweight and human-readable so `serializeLaunchContext` can turn
   * them into a natural-language summary for the model.
   */
  objectType?: LaunchContextObjectType;
  objectId?: string;
  /**
   * Optional identifier for the specific field being edited – for example,
   * "narrative", "description", or "notes".
   */
  fieldId?: string;
  /**
   * Optional human-readable label for the field being edited. This lets
   * callers distinguish between multiple textareas on the same screen while
   * keeping the launch context compact.
   */
  fieldLabel?: string;
  /**
   * Optional snapshot of the current field text. Hosts should truncate this
   * as needed before passing it in so prompts stay within reasonable bounds.
   */
  currentText?: string;
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
  /**
   * Optional rendering mode hint so presenters know whether this step’s copy
   * should come directly from the LLM promptTemplate or from a static string.
   * When omitted, presenters should assume normal LLM-driven behavior.
   */
  renderMode?: 'llm' | 'static';
  /**
   * Optional exact assistant copy for this step when renderMode === 'static'.
   * This lets us bypass the LLM entirely for simple, declarative messages
   * (welcome lines, confirmations, etc).
   */
  staticCopy?: string;
  /**
   * Optional UI metadata for this step. For form-style steps this can include
   * fields and primary action labels so presenters can render cards directly
   * from the workflow definition.
   */
  ui?: {
    title?: string;
    description?: string;
    fields?: {
      id: string;
      label: string;
      type?: string;
      placeholder?: string;
    }[];
    primaryActionLabel?: string;
  };
  /**
   * Optional hint for host chat surfaces about whether the generic free-form
   * chat composer ("Ask anything") should be visible while this step is
   * active. When true, presenters like `AiChatPane` can hide the bottom input
   * so the user focuses on the structured card or assistant copy for this
   * step.
   */
  hideFreeformChatInput?: boolean;
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
//
// The pattern for registering a workflow is:
// 1. Define a high-level `WorkflowSpec` in `domain/workflowSpecs/*.ts` that is
//    easy to read and edit (id, label, steps, prompts, simple UI hints).
// 2. Add a small compiler here that maps that spec into the lower-level
//    `WorkflowDefinition` shape used by the runtime.
// 3. Export the compiled `WorkflowDefinition` and register it in
//    `WORKFLOW_DEFINITIONS` so AgentWorkspace and other hosts can look it up
//    by ID.
//
// To add a **new** workflow in the future, follow the same steps:
// - Create `workflowSpecs/myNewWorkflowSpec.ts`.
// - Write a `compileMyNewWorkflowSpec` function here.
// - Export `MY_NEW_WORKFLOW` and add an entry in `WORKFLOW_DEFINITIONS`.

export const FIRST_TIME_ONBOARDING_WORKFLOW_V2_ID = 'first_time_onboarding_v2';

// Map the business-level `StepKind` into the runtime `WorkflowStepType`.
const mapStepKindToType = (kind: FirstTimeOnboardingStepSpec['kind']): WorkflowStepType => {
  if (kind === 'agent_generate') {
    return 'agent_generate';
  }
  // For now, confirm and assistant-only steps both map to collect_fields since
  // the runtime doesn’t distinguish them structurally.
  return 'collect_fields';
};

// Compile the high-level v2 onboarding spec into a `WorkflowDefinition`
// understood by the runtime. This keeps the "authoring" surface (spec) clean
// while preserving the existing engine.
const compileFirstTimeOnboardingV2Spec = (
  spec: FirstTimeOnboardingWorkflowSpec
): WorkflowDefinition => {
  const steps: WorkflowStep[] = spec.steps.map((step) => {
    let lengthHint: string | undefined;
    if (step.copyLength === 'one_sentence') {
      lengthHint = 'Keep your visible reply to a single short sentence.';
    } else if (step.copyLength === 'two_sentences') {
      lengthHint = 'Keep your visible reply to one or two short sentences.';
    } else if (step.copyLength === 'short_paragraph') {
      lengthHint = 'Keep your visible reply to one short paragraph (2–3 sentences).';
    }

    const promptTemplate = [step.prompt, lengthHint].filter(Boolean).join(' ');

    const ui =
      step.ui && (step.ui.title || step.ui.description || step.ui.fields || step.ui.primaryActionLabel)
        ? {
            title: step.ui.title,
            description: step.ui.description,
            primaryActionLabel: step.ui.primaryActionLabel,
            fields: step.ui.fields?.map((field) => ({
              id: field.id,
              label: field.label,
              type: field.type,
              placeholder: field.placeholder,
            })),
          }
        : undefined;

    return {
      id: step.id,
      type: mapStepKindToType(step.kind),
      label: step.label,
      fieldsCollected: step.collects,
      promptTemplate,
      validationHint: step.validationHint,
      nextStepId: step.next,
      renderMode: step.renderMode,
      staticCopy: step.staticCopy,
      ui,
      hideFreeformChatInput: step.hideFreeformChatInput,
    };
  });

  return {
    id: spec.id,
    label: spec.label,
    version: spec.version,
    chatMode: spec.chatMode as ChatMode,
    outcomeSchema: spec.outcomeSchema,
    steps,
  };
};

export const FIRST_TIME_ONBOARDING_WORKFLOW_V2: WorkflowDefinition =
  compileFirstTimeOnboardingV2Spec(FIRST_TIME_ONBOARDING_V2_SPEC);

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

export const ACTIVITY_CREATION_WORKFLOW_ID = 'activity_creation_v1';

export const ACTIVITY_CREATION_WORKFLOW: WorkflowDefinition = {
  id: ACTIVITY_CREATION_WORKFLOW_ID,
  label: 'Activity creation',
  version: 1,
  chatMode: 'activityCreation',
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
        'Briefly acknowledge the focused goal or life area the host provides and restate that you will suggest a few concrete, near-term activities. Infer a reasonable time horizon and energy level from the context instead of asking the user to choose between “light” vs “focused” or specific durations. Only ask one very short clarifying question if their description is extremely vague or if they mention hard constraints that clearly change what you should propose. Keep this lightweight so you can move quickly into concrete recommendations.',
      validationHint:
        'Ensure there is at least a short free-text prompt describing the kind of progress the user wants to make and a rough time horizon.',
      nextStepId: 'agent_generate_activities',
    },
    {
      id: 'agent_generate_activities',
      type: 'agent_generate',
      label: 'Generate activity suggestions',
      fieldsCollected: [],
      promptTemplate:
        'Given the user’s context, any focused goal from the launch context, and the workspace snapshot of existing goals and activities, propose a small, diverse set of 3–5 concrete, bite-sized activities they could actually do in the stated time horizon. Start with 1–2 short sentences that anchor to the goal and recap the horizon/energy you are aiming for, then present a tidy bullet list where each item has: (a) an activity title that could be used in the app, (b) an approximate time/energy label, (c) one short “why this matters” line, and (d) a 2–6 item checklist of steps that belong in a single work session. Prefer small, realistic steps over vague or massive projects, and avoid duplicating existing activities word-for-word.',
      validationHint:
        'Activities should be specific, doable in a single sitting, and not simply restate existing activities verbatim unless the user explicitly wants to revisit something.',
      nextStepId: 'confirm_activities',
    },
    {
      id: 'confirm_activities',
      type: 'confirm',
      label: 'Confirm or edit activities',
      fieldsCollected: ['adoptedActivityTitles'],
      promptTemplate:
        'Help the user pick one to three activities to adopt right now. Encourage trimming or rephrasing suggestions so they feel light and realistic. Capture the titles of any activities the user explicitly chooses so the host app can create them.',
      validationHint:
        'Capture the final activity titles the user confirms; leave the list empty if they decide not to adopt any yet.',
    },
  ],
};

export const WORKFLOW_DEFINITIONS: Record<string, WorkflowDefinition> = {
  [FIRST_TIME_ONBOARDING_WORKFLOW_V2_ID]: FIRST_TIME_ONBOARDING_WORKFLOW_V2,
  [ARC_CREATION_WORKFLOW_ID]: ARC_CREATION_WORKFLOW,
  [ACTIVITY_CREATION_WORKFLOW_ID]: ACTIVITY_CREATION_WORKFLOW,
};



