export type GoalInvitePreviewFailure = {
  kind: 'sign_in' | 'unavailable' | 'retry';
  title: string;
  message: string;
};

export function getGoalInvitePreviewFailure(error: {
  status?: number;
  code?: string;
}): GoalInvitePreviewFailure {
  if (error.status === 401 || error.code === 'unauthorized') {
    return {
      kind: 'sign_in',
      title: 'Sign in to review',
      message: 'This invitation is tied to one Kwilt account. Sign in to see who invited you and what the Goal shares.',
    };
  }
  if (error.status === 403 || error.code === 'invite_unavailable') {
    return {
      kind: 'unavailable',
      title: 'Invitation unavailable',
      message: 'This invitation is for a different Kwilt account or is no longer available.',
    };
  }
  return {
    kind: 'retry',
    title: 'Couldn’t load invitation',
    message: 'Check your connection and try again.',
  };
}
