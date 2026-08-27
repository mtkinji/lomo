import type { CanonicalAgentRunRequest } from './agentRuntime.ts';
import {
  enqueueCanonicalAgentRun,
  type AgentRunPersistence,
  type AgentRunCoordinatorResult,
  type EnqueuedAgentRun,
} from './agentRunCoordinator.ts';

export type MobileAgentRunAcceptance =
  | {
      state: 'accepted';
      replayed: boolean;
      run: EnqueuedAgentRun;
    }
  | Extract<AgentRunCoordinatorResult, { replayed: true }>;

export async function acceptMobileAgentRun({
  request,
  persistence,
  execute,
  schedule,
}: {
  request: CanonicalAgentRunRequest;
  persistence: AgentRunPersistence;
  execute: (run: EnqueuedAgentRun) => Promise<unknown>;
  schedule: (task: Promise<unknown>) => void;
}): Promise<MobileAgentRunAcceptance> {
  const run = await enqueueCanonicalAgentRun({ request, persistence });
  const scheduleExecution = () => {
    const task = execute(run);
    schedule(task);
  };
  if (run.replayed) {
    if (run.status === 'complete' || run.status === 'partial') {
      const replay = await persistence.loadReplay(run);
      return { state: replay.status, replayed: true, run, answer: replay.answer };
    }
    if (run.status === 'queued') scheduleExecution();
    return { state: 'accepted', replayed: true, run };
  }

  scheduleExecution();
  return { state: 'accepted', replayed: false, run };
}
