import { createContext, useContext } from 'react';
import type { WorkflowDefinition, WorkflowInstance } from '../../domain/workflows';

export type InvokeAgentStepParams = {
  /**
   * Logical workflow step identifier to invoke. Callers should pass the
   * definition's `WorkflowStep.id` (for example, "agent_generate_arc").
   */
  stepId: string;
};

export type WorkflowRuntimeContextValue = {
  definition?: WorkflowDefinition;
  instance: WorkflowInstance | null;
  /**
   * Mark a workflow step as completed and optionally attach collected data.
   * The runtime is responsible for updating currentStepId based on the
   * definition's transition graph.
   */
  completeStep: (
    stepId: string,
    collected?: Record<string, unknown>,
    nextStepIdOverride?: string
  ) => void;
  /**
   * Optional helper for invoking an agent-driven step (typically
   * `type === 'agent_generate'`). The host runtime is responsible for:
   * - building the full prompt/context,
   * - calling the underlying transport (sendCoachChat),
   * - and inserting any loading / result cards into the shared timeline.
   *
   * Presenters should treat this as the primary entrypoint for kicking off
   * LLM work tied to a workflow step instead of calling `sendCoachChat`
   * directly.
   */
  invokeAgentStep?: (params: InvokeAgentStepParams) => Promise<void>;
};

export const WorkflowRuntimeContext = createContext<WorkflowRuntimeContextValue | undefined>(
  undefined
);

export const useWorkflowRuntime = (): WorkflowRuntimeContextValue | undefined =>
  useContext(WorkflowRuntimeContext);



