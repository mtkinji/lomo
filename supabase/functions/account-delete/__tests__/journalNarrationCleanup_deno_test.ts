import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import { removeJournalNarration } from '../journalNarrationCleanup.ts';
Deno.test('accounts without a clone do not call ElevenLabs', async () => {
  const calls: string[] = [];
  await removeJournalNarration('owner', {
    profile: async () => null,
    removeVoice: async () => { calls.push('provider'); },
    removeProfile: async () => { calls.push('database'); },
  });
  assertEquals(calls, []);
});
Deno.test('provider deletion precedes profile deletion and failure preserves retry identity', async () => {
  const calls: string[] = [];
  const deps = {
    profile: async () => ({ state: 'ready', voice_id: 'voice' }),
    removeVoice: async (): Promise<void> => { calls.push('provider'); throw Error('unavailable'); },
    removeProfile: async () => { calls.push('database'); },
  };
  await assertRejects(() => removeJournalNarration('owner', deps));
  assertEquals(calls, ['provider']);
  calls.length = 0;
  deps.removeVoice = async () => { calls.push('provider'); };
  await removeJournalNarration('owner', deps);
  assertEquals(calls, ['provider', 'database']);
});
Deno.test('unknown in-flight clone creation cannot be silently orphaned', async () => {
  await assertRejects(() => removeJournalNarration('owner', {
    profile: async () => ({ state: 'creating', voice_id: null }),
    removeVoice: async () => {}, removeProfile: async () => { throw Error('must not remove'); },
  }), Error, 'journal_narration_reconciliation_required');
});
