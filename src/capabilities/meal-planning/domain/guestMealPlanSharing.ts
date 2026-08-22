export type GuestMealPlanInvitation = {
  inviteId: string;
  token: string;
  expiresAt: string;
};

export async function shareGuestMealPlan(input: {
  planId: string;
  planVersion: number;
  currentInvitation: GuestMealPlanInvitation | null;
  createInvite(params: {
    planId: string;
    expectedVersion: number;
    expiresAt: string | null;
  }): Promise<GuestMealPlanInvitation>;
  shareUrl(params: {
    url: string;
    message: string;
    subject: string;
    androidDialogTitle: string;
    onShareSheetDismissStart?(): void;
  }): Promise<void>;
  onShareSheetDismissStart?(): void;
}): Promise<GuestMealPlanInvitation> {
  const invitation = input.currentInvitation ?? await input.createInvite({
    planId: input.planId,
    expectedVersion: input.planVersion,
    expiresAt: null,
  });
  await input.shareUrl({
    url: `https://go.kwilt.app/meal-plan/${encodeURIComponent(invitation.token)}`,
    message: 'Choose the meals you’d eat or suggest one that’s missing.',
    subject: 'Help choose our next meals',
    androidDialogTitle: 'Share meal plan',
    onShareSheetDismissStart: input.onShareSheetDismissStart,
  });
  return invitation;
}
