type GoalInviteDestinationUrlInput = {
  primaryOpenUrl: string;
  inviteRedirectUrl: string | null;
  inviteLandingUrl: string | null;
  isExpoGo: boolean;
};

export function selectGoalInviteDestinationUrls({
  primaryOpenUrl,
  inviteRedirectUrl,
  inviteLandingUrl,
  isExpoGo,
}: GoalInviteDestinationUrlInput): { tapUrl: string; shareUrl: string } {
  let fallbackTapUrl = primaryOpenUrl;

  // Expo Go cannot open the production deep link directly, so the redirect
  // carries it as an explicit handoff destination.
  if (inviteRedirectUrl) {
    fallbackTapUrl = isExpoGo
      ? `${inviteRedirectUrl}?exp=${encodeURIComponent(primaryOpenUrl)}`
      : inviteRedirectUrl;
  }

  return {
    // Landing URLs are best for human taps; redirects retain share-preview metadata.
    tapUrl: inviteLandingUrl ?? fallbackTapUrl,
    shareUrl: inviteRedirectUrl ?? inviteLandingUrl ?? fallbackTapUrl,
  };
}
