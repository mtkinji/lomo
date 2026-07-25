import { selectGoalInviteDestinationUrls } from './goalInviteDestinationUrl';

const primaryOpenUrl = 'kwilt://invite/goal-code';
const inviteRedirectUrl = 'https://api.kwilt.app/i/goal-code';
const inviteLandingUrl = 'https://kwilt.app/share/goal-code';

describe('selectGoalInviteDestinationUrls', () => {
  it('uses the native open URL when no public destinations exist', () => {
    expect(
      selectGoalInviteDestinationUrls({
        primaryOpenUrl,
        inviteRedirectUrl: null,
        inviteLandingUrl: null,
        isExpoGo: false,
      }),
    ).toEqual({ tapUrl: primaryOpenUrl, shareUrl: primaryOpenUrl });
  });

  it('prefers the landing URL for taps and the redirect URL for sharing', () => {
    expect(
      selectGoalInviteDestinationUrls({
        primaryOpenUrl,
        inviteRedirectUrl,
        inviteLandingUrl,
        isExpoGo: false,
      }),
    ).toEqual({ tapUrl: inviteLandingUrl, shareUrl: inviteRedirectUrl });
  });

  it('uses the one available public destination for both purposes', () => {
    expect(
      selectGoalInviteDestinationUrls({
        primaryOpenUrl,
        inviteRedirectUrl: null,
        inviteLandingUrl,
        isExpoGo: false,
      }),
    ).toEqual({ tapUrl: inviteLandingUrl, shareUrl: inviteLandingUrl });

    expect(
      selectGoalInviteDestinationUrls({
        primaryOpenUrl,
        inviteRedirectUrl,
        inviteLandingUrl: null,
        isExpoGo: false,
      }),
    ).toEqual({ tapUrl: inviteRedirectUrl, shareUrl: inviteRedirectUrl });
  });

  it('routes Expo Go taps through the redirect without changing the share URL', () => {
    expect(
      selectGoalInviteDestinationUrls({
        primaryOpenUrl,
        inviteRedirectUrl,
        inviteLandingUrl: null,
        isExpoGo: true,
      }),
    ).toEqual({
      tapUrl: `${inviteRedirectUrl}?exp=${encodeURIComponent(primaryOpenUrl)}`,
      shareUrl: inviteRedirectUrl,
    });
  });
});
