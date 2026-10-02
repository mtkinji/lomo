type Dependencies = {
  profile(owner: string): Promise<{ state: string; voice_id: string | null } | null>;
  removeVoice(voiceID: string): Promise<void>;
  removeProfile(owner: string): Promise<void>;
};

/** Provider identity is retained until remote deletion succeeds, allowing safe retries. */
export async function removeJournalNarration(owner: string, deps: Dependencies): Promise<void> {
  const profile = await deps.profile(owner);
  if (!profile) return;
  if (profile.state === 'creating') throw Error('journal_narration_reconciliation_required');
  if (profile.voice_id) await deps.removeVoice(profile.voice_id);
  await deps.removeProfile(owner);
}
