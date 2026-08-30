export type UnifiedChatResumeRefreshReason = 'client_action' | 'server_run' | 'proposal';

type ResumeRefreshInput = {
  clientActions?: ReadonlyArray<{ status: string }>;
  runs: ReadonlyArray<{ originChannel?: string; status: string }>;
  proposals?: ReadonlyArray<{ status: string }>;
};

/** Identify durable work that may have changed while the app was backgrounded. */
export function unifiedChatResumeRefreshReason(
  input: ResumeRefreshInput,
): UnifiedChatResumeRefreshReason | null {
  if ((input.clientActions ?? []).some(
    (item) => item.status === 'pending_client_action' || item.status === 'presenting',
  )) return 'client_action';
  if (input.runs.some((run) =>
    run.originChannel === 'mobile' && (run.status === 'queued' || run.status === 'active'))
  ) return 'server_run';
  if ((input.proposals ?? []).some(
    (proposal) => proposal.status === 'pending' || proposal.status === 'edited' || proposal.status === 'deferred',
  )) return 'proposal';
  return null;
}
