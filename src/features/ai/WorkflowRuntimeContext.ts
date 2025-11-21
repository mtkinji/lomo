import { createContext, useContext } from 'react';
import type { WorkflowDefinition, WorkflowInstance } from '../../domain/workflows';

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
};

export const WorkflowRuntimeContext = createContext<WorkflowRuntimeContextValue | undefined>(
  undefined
);

export const useWorkflowRuntime = (): WorkflowRuntimeContextValue | undefined =>
  useContext(WorkflowRuntimeContext);



