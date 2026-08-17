import { shareGuestMealPlan } from './guestMealPlanSharing';

describe('shareGuestMealPlan', () => {
  it('creates one guest link and shares the URL as the rich-preview item', async () => {
    const createInvite = jest.fn().mockResolvedValue({
      inviteId: 'invite-1',
      token: 'guest token',
      expiresAt: '2026-08-20T00:00:00.000Z',
    });
    const shareUrl = jest.fn().mockResolvedValue(undefined);
    const onAskHousehold = jest.fn();
    const onShareSheetDismissStart = jest.fn();

    const invitation = await shareGuestMealPlan({
      planId: 'plan-1',
      planVersion: 3,
      currentInvitation: null,
      createInvite,
      shareUrl,
      onAskHousehold,
      onShareSheetDismissStart,
    });

    expect(createInvite).toHaveBeenCalledWith({ planId: 'plan-1', expectedVersion: 3, expiresAt: null });
    expect(shareUrl).toHaveBeenCalledWith({
      url: 'https://go.kwilt.app/meal-plan/guest%20token',
      message: 'Choose the meals you’d eat or suggest one that’s missing.',
      subject: 'Help choose our next meals',
      androidDialogTitle: 'Share meal plan',
      onAskHousehold,
      onShareSheetDismissStart,
    });
    expect(invitation.inviteId).toBe('invite-1');
  });

  it('reuses the current guest link while the Plan remains open', async () => {
    const currentInvitation = {
      inviteId: 'invite-1',
      token: 'guest-token',
      expiresAt: '2026-08-20T00:00:00.000Z',
    };
    const createInvite = jest.fn();
    const shareUrl = jest.fn().mockResolvedValue(undefined);

    await shareGuestMealPlan({
      planId: 'plan-1',
      planVersion: 3,
      currentInvitation,
      createInvite,
      shareUrl,
    });

    expect(createInvite).not.toHaveBeenCalled();
    expect(shareUrl).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://go.kwilt.app/meal-plan/guest-token',
    }));
  });
});
