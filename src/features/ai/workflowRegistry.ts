import type { GeneratedArc } from '../../services/ai';
import type { AgentComponentId } from '../../domain/agentComponents';
import { listIdealArcTemplates } from '../../domain/idealArcs';
import type { WorkflowDefinition } from '../../domain/workflows';
import { goalCreationWorkflow } from './workflows/goalCreationWorkflow';
import { arcCreationWorkflow } from './workflows/arcCreationWorkflow';
import { activityCreationWorkflow } from './workflows/activityCreationWorkflow';
import { activityGuidanceWorkflow } from './workflows/activityGuidanceWorkflow';
import { firstTimeOnboardingWorkflow } from './workflows/firstTimeOnboardingWorkflow';

/**
 * High-level modes that describe what job the AI chat is doing.
 * Each mode maps 1:1 to a workflow definition.
 */
export type ChatMode =
  | 'arcCreation'
  | 'firstTimeOnboarding'
  | 'goalCreation'
  | 'activityCreation'
  | 'activityGuidance';

/**
 * Logical identifiers for tools the AI can call.
 * These are intentionally broader than the current implementation so we can
 * evolve from client-side helpers to server-side / 3rd party tools without
 * changing the calling code.
 */
export type ChatToolId =
  | 'generateArcs'
  | 'adoptArc'
  | 'listActivitiesForGoal'
  | 'suggestScheduleForActivities'
  | 'scheduleActivitiesOnCalendar';

export type ChatToolKind = 'internal_ai' | 'internal_store' | 'external_integration';

export type ChatToolConfig = {
  id: ChatToolId;
  /**
   * Human-readable description used in prompts / documentation.
   */
  description: string;
  /**
   * Rough category so we can reason about where the tool executes.
   * - internal_ai: calls OpenAI or similar to generate suggestions.
   * - internal_store: reads/writes the app’s own data.
   * - external_integration: talks to 3rd party services (calendar, tasks, etc).
   */
  kind: ChatToolKind;
  /**
   * Whether this tool requires the user to have connected a 3rd party account.
   * (e.g. calendar integrations).
   */
  requiresAuth?: boolean;
  /**
   * Optional server endpoint or logical operation name, so a future
   * server-side agent/orchestrator can map tools to real capabilities.
   */
  serverOperation?: string;
};


/**
 * Validates that a workflow definition is well-formed.
 * This enforces structural rules that prevent runtime errors.
 */
function validateWorkflowDefinition(workflow: WorkflowDefinition): void {
  if (!workflow.id) {
    throw new Error(`Workflow missing id: ${JSON.stringify(workflow)}`);
  }
  if (!workflow.chatMode) {
    throw new Error(`Workflow ${workflow.id} missing chatMode`);
  }
  if (!workflow.systemPrompt) {
    throw new Error(`Workflow ${workflow.id} missing systemPrompt`);
  }
  if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
    throw new Error(`Workflow ${workflow.id} must have at least one step`);
  }

  // Validate step transitions
  const stepIds = new Set(workflow.steps.map((s) => s.id));
  for (const step of workflow.steps) {
    if (step.nextStepId && !stepIds.has(step.nextStepId)) {
      throw new Error(
        `Workflow ${workflow.id} step ${step.id} references invalid nextStepId: ${step.nextStepId}`
      );
    }
    if (step.nextStepOnConfirmId && !stepIds.has(step.nextStepOnConfirmId)) {
      throw new Error(
        `Workflow ${workflow.id} step ${step.id} references invalid nextStepOnConfirmId: ${step.nextStepOnConfirmId}`
      );
    }
    if (step.nextStepOnEditId && !stepIds.has(step.nextStepOnEditId)) {
      throw new Error(
        `Workflow ${workflow.id} step ${step.id} references invalid nextStepOnEditId: ${step.nextStepOnEditId}`
      );
    }
  }
}

// Validate all workflows at module load time
validateWorkflowDefinition(goalCreationWorkflow);
validateWorkflowDefinition(arcCreationWorkflow);
validateWorkflowDefinition(activityCreationWorkflow);
validateWorkflowDefinition(activityGuidanceWorkflow);
validateWorkflowDefinition(firstTimeOnboardingWorkflow);

/**
 * Registry of all available workflows, keyed by ChatMode.
 * Each workflow is a complete WorkflowDefinition that includes system prompt,
 * tools, steps, and outcome schema.
 */
export const WORKFLOW_REGISTRY: Record<ChatMode, WorkflowDefinition> = {
  goalCreation: goalCreationWorkflow,
  arcCreation: arcCreationWorkflow,
  activityCreation: activityCreationWorkflow,
  activityGuidance: activityGuidanceWorkflow,
  firstTimeOnboarding: firstTimeOnboardingWorkflow,
};

/**
 * Convenience helper for hosts that launch AgentWorkspace.
 *
 * This keeps the chosen ChatMode and the workflowDefinitionId in sync so
 * callers don’t accidentally pair a mode with the wrong workflow ID.
 */
export function getWorkflowLaunchConfig(
  mode: ChatMode
): { mode: ChatMode; workflowDefinitionId: string } {
  const definition = WORKFLOW_REGISTRY[mode];
  return {
    mode,
    workflowDefinitionId: definition.id,
  };
}

/**
 * Example payload shape for tools that surface Arc suggestions back into the UI.
 * As we add more modes and tools, we can introduce richer discriminated unions.
 */
export type ArcSuggestionToolPayload = {
  mode: 'arcCreation';
  suggestions: GeneratedArc[];
};


