import { getGoalInvitePreviewFailure } from './goalInvitePreviewFailure';

describe('Goal invite preview failure presentation', () => {
  it('offers sign-in as review, never acceptance', () => {
    expect(getGoalInvitePreviewFailure({ status: 401, code: 'unauthorized' })).toEqual({
      kind: 'sign_in',
      title: 'Sign in to review',
      message: 'This invitation is tied to one Kwilt account. Sign in to see who invited you and what the Goal shares.',
    });
  });

  it('does not reveal details to the wrong authenticated account', () => {
    expect(getGoalInvitePreviewFailure({ status: 403, code: 'invite_unavailable' })).toEqual({
      kind: 'unavailable',
      title: 'Invitation unavailable',
      message: 'This invitation is for a different Kwilt account or is no longer available.',
    });
  });

  it('keeps transient failures retryable', () => {
    expect(getGoalInvitePreviewFailure({ status: 503 })).toEqual({
      kind: 'retry',
      title: 'Couldn’t load invitation',
      message: 'Check your connection and try again.',
    });
  });
});
