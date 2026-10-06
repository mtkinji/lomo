import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import { prepareStoriesAccountDeletion } from '../storiesAccountCleanup.ts';
import { AccountDeletionError } from '../accountDeletion.ts';
const actor = '11111111-1111-4111-8111-111111111111';
Deno.test('Stories erasure is admitted before completion is checked and only verified readiness continues', async () => {
  const names: string[] = [];
  await prepareStoriesAccountDeletion(actor, async (name, body) => {
    names.push(name); assertEquals(body, { p_actor: actor });
    return name === 'stories_begin_account_deletion' ? { state: 'pending' } : { ready: true };
  });
  assertEquals(names, ['stories_begin_account_deletion', 'stories_finish_account_deletion']);
});
Deno.test('pending, missing, and failed cleanup never allow downstream account destruction', async () => {
  for (const result of [null, {}, { ready: false }]) {
    await assertRejects(() => prepareStoriesAccountDeletion(actor, async (name) =>
      name === 'stories_begin_account_deletion' ? { state: 'pending' } : result), AccountDeletionError, 'still being removed');
  }
  for (const failedStage of ['stories_begin_account_deletion', 'stories_finish_account_deletion']) {
    await assertRejects(() => prepareStoriesAccountDeletion(actor, async (name) => {
      if (name === failedStage) throw Error('private provider details');
      return { state: 'pending' };
    }), AccountDeletionError, 'couldn’t check');
  }
});
