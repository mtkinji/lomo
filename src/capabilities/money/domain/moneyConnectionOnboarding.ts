export type MoneyConnectionOnboardingPhase =
  | 'unprepared'
  | 'preparing'
  | 'ready'
  | 'presented'
  | 'exchanging'
  | 'cancelled'
  | 'error';

export type MoneyConnectionOnboardingPresentation = {
  actionLabel: 'Connect accounts' | 'Try again' | null;
  body: string;
  loadingActionLabel: string | null;
  title: string;
};

export function getMoneyConnectionOnboardingPresentation(
  phase: MoneyConnectionOnboardingPhase,
  errorMessage?: string | null,
): MoneyConnectionOnboardingPresentation {
  if (phase === 'preparing' || phase === 'unprepared') {
    return {
      actionLabel: 'Connect accounts',
      body: 'Kwilt uses secure account history to recognize real income, fixed costs, and everyday spending.',
      loadingActionLabel: 'Preparing secure connection…',
      title: 'Connect the accounts that matter',
    };
  }
  if (phase === 'presented' || phase === 'exchanging') {
    return {
      actionLabel: null,
      body: 'Keep Kwilt open while the account connection is secured.',
      loadingActionLabel: null,
      title: 'Finishing your connection',
    };
  }
  if (phase === 'cancelled') {
    return {
      actionLabel: 'Try again',
      body: "Nothing was connected. You can try again when you're ready.",
      loadingActionLabel: null,
      title: 'Connect the accounts that matter',
    };
  }
  if (phase === 'error') {
    return {
      actionLabel: 'Try again',
      body: errorMessage ?? 'Kwilt could not finish the secure account connection.',
      loadingActionLabel: null,
      title: "We couldn't connect that account",
    };
  }
  return {
    actionLabel: 'Connect accounts',
    body: 'Kwilt uses secure account history to recognize real income, fixed costs, and everyday spending.',
    loadingActionLabel: null,
    title: 'Connect the accounts that matter',
  };
}
