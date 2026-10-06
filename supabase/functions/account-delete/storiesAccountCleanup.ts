import { AccountDeletionError } from './accountDeletion.ts';

type RPC = (name: string, body: { p_actor: string }) => Promise<unknown>;

/** Workers erase copies between retries; never retain the user's JWT in a job. */
export async function prepareStoriesAccountDeletion(userId: string, rpc: RPC): Promise<void> {
  let result: unknown;
  try {
    const admitted = await rpc('stories_begin_account_deletion', { p_actor: userId });
    if (!admitted || typeof admitted !== 'object' || !('state' in admitted) || admitted.state !== 'pending') {
      throw Error('Stories admission unavailable');
    }
    result = await rpc('stories_finish_account_deletion', { p_actor: userId });
  } catch {
    throw new AccountDeletionError('stories_cleanup_required', 503, true,
      'We couldn’t check story cleanup. Your account has not been deleted. Please try again.');
  }
  if (!result || typeof result !== 'object' || !('ready' in result) || result.ready !== true) {
    throw new AccountDeletionError('stories_cleanup_required', 409, true,
      'Your stories are still being removed. Your account deletion is pending. Check again shortly.');
  }
}
