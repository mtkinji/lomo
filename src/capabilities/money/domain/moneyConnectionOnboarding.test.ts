import { getMoneyConnectionOnboardingPresentation } from './moneyConnectionOnboarding';

describe('money connection onboarding presentation', () => {
  it('keeps preparation inside the connect step', () => {
    expect(getMoneyConnectionOnboardingPresentation('preparing')).toMatchObject({
      actionLabel: 'Connect accounts',
      loadingActionLabel: 'Preparing secure connection…',
      title: 'Connect the accounts that matter',
    });
  });

  it('removes the action while a returned public token becomes durable evidence', () => {
    expect(getMoneyConnectionOnboardingPresentation('exchanging')).toEqual({
      actionLabel: null,
      body: 'Keep Kwilt open while the account connection is secured.',
      loadingActionLabel: null,
      title: 'Finishing your connection',
    });
  });

  it('keeps cancellation and failure recoverable in the connect step', () => {
    expect(getMoneyConnectionOnboardingPresentation('cancelled')).toMatchObject({
      actionLabel: 'Try again',
      title: 'Connect the accounts that matter',
    });
    expect(getMoneyConnectionOnboardingPresentation('error', 'Bank connection expired.')).toMatchObject({
      actionLabel: 'Try again',
      body: 'Bank connection expired.',
      title: "We couldn't connect that account",
    });
  });
});
