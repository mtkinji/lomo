export type MoneyPrivacyPresentation = 'content' | 'privacy-cover' | 'unlock';

export function shouldRequestMoneyUnlock(input: {
  locked: boolean;
  covered: boolean;
  unlocking: boolean;
  attempted: boolean;
}): boolean {
  return input.locked && !input.covered && !input.unlocking && !input.attempted;
}

export function getMoneyPrivacyPresentation(input: {
  loaded: boolean;
  covered: boolean;
  locked: boolean;
  automaticUnlockPending?: boolean;
}): MoneyPrivacyPresentation {
  if (!input.loaded || input.covered || input.automaticUnlockPending) return 'privacy-cover';
  return input.locked ? 'unlock' : 'content';
}
