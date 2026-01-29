import type { ChatMode } from '../features/ai/workflowRegistry';

// --- Launch context --------------------------------------------------------

export type LaunchSource =
  | 'firstTimeAppOpen'
  | 'todayScreen'
  | 'arcsList'
  | 'arcsScreenNewArc'
  | 'activitiesList'
  | 'arcDetail'
  | 'goalDetail'
  | 'activityDetail'
  | 'chapterDetail'
  | 'devTools'
  | 'standaloneCoach'
  | 'shareExtension';

export type LaunchIntent =
  | 'firstTimeOnboarding'
  | 'arcCreation'
  | 'goalCreation'
  | 'activityCreation'
  | 'freeCoach'
  | 'arcEditing'
  | 'goalEditing'
  | 'activityEditing'
  | 'editField'
  | 'shareIntake';

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
  /**
   * Optional behavior hints for steps that invoke the agent. This lets hosts
   * keep progress copy and other step-specific UX in the workflow definition
   * instead of hard-coding it in presenters or runtimes.
   */
  agentBehavior?: {
    /**
     * Optional loading message to display in the shared chat timeline while
     * this step's agent call is in flight.
     */
    loadingMessage?: string;
    /**
     * Optional stable identifier for the loading message bubble. When omitted,
     * the runtime will generate a generic id for this step.
     */
    loadingMessageId?: string;
  };
};

export type WorkflowDefinition = {
  id: string;
  label: string;
  version: number;
  /**
   * The ChatMode this workflow operates in. This determines which system
   * prompt and tools are used.
   */
  chatMode: ChatMode;
  /**
   * System prompt that describes the job, process, and tone for this workflow.
   * This is combined with launch context when constructing the full system
   * message for the chat helper.
   */
  systemPrompt: string;
  /**
   * Tools that the AI is allowed to use in this workflow.
   */
  tools: import('../features/ai/workflowRegistry').ChatToolConfig[];
  /**
   * Whether the chat pane should automatically request the first assistant
   * message on mount so the conversation opens with guidance.
   */
  autoBootstrapFirstMessage?: boolean;
  /**
   * Optional list of component IDs that the agent is allowed to reference in
   * this workflow. This is used for system prompts and future JSON handoffs so
   * the agent knows which UI building blocks exist on this surface.
   */
  renderableComponents?: import('../domain/agentComponents').AgentComponentId[];
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


// --- Workflow ID constants --------------------------------------------------
//
// Workflow IDs now match ChatMode values. These are exported for convenience
// when passing workflowDefinitionId to components.
//
// To add a new workflow:
// 1. Create a workflow file in `src/features/ai/workflows/myNewWorkflow.ts`
//    that exports a complete `WorkflowDefinition`.
// 2. Import and register it in `src/features/ai/workflowRegistry.ts`.
// 3. Add a constant here for convenience.

export const FIRST_TIME_ONBOARDING_WORKFLOW_V2_ID = 'firstTimeOnboarding';
export const ARC_CREATION_WORKFLOW_ID = 'arcCreation';
export const GOAL_CREATION_WORKFLOW_ID = 'goalCreation';
export const ACTIVITY_CREATION_WORKFLOW_ID = 'activityCreation';
