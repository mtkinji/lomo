import {
  createExecutionTargetFromDefinition,
  deleteExecutionTarget,
  listExecutionTargetDefinitions,
  listExecutionTargets,
  updateExecutionTarget,
} from '../../../services/executionTargets/executionTargets';
import type { ExecutionTargetActionsBoundary } from './executionTargetActions';
import { createExecutionTargetActions } from './executionTargetActions';

export const DEFAULT_EXECUTION_TARGET_ACTIONS_BOUNDARY: ExecutionTargetActionsBoundary = {
  loadDefinitions: listExecutionTargetDefinitions,
  loadTargets: listExecutionTargets,
  create: createExecutionTargetFromDefinition,
  update: updateExecutionTarget,
  remove: deleteExecutionTarget,
};

export const executionTargetActions = createExecutionTargetActions(DEFAULT_EXECUTION_TARGET_ACTIONS_BOUNDARY);
