export function shouldConsumeCoachChatCredit(options?: {
  aiJob?: string;
  creditPolicy?: 'user_turn' | 'internal_helper';
  mode?: string;
}): boolean {
  if (options?.creditPolicy === 'internal_helper') {
    if (options.aiJob !== 'lightweight_helper') {
      throw new Error('Internal helper credit policy requires lightweight_helper');
    }
    return false;
  }
  return options?.mode !== 'firstTimeOnboarding';
}
