import {
  getUnifiedChatActionFailureMessage,
  getUnifiedChatFailureCopy,
  isUnifiedChatRunRetryable,
} from './chatFailure';

describe('getUnifiedChatFailureCopy', () => {
  test('names the missing review boundary without exposing an internal code', () => {
    expect(getUnifiedChatFailureCopy({
      failureCode: 'action_outcome_missing',
      participatingCapabilities: ['plan'],
    })).toEqual({
      label: 'Plan change not ready',
      detail: "Kwilt didn't receive a reviewable Plan change, so nothing was changed.",
    });
  });

  test('keeps unknown failures brief and honest', () => {
    expect(getUnifiedChatFailureCopy({
      failureCode: 'private_internal_code',
      participatingCapabilities: [],
    })).toEqual({
      label: 'Response interrupted',
      detail: 'No reply was saved.',
    });
  });

  test('explains quota exhaustion and does not offer a retry that cannot succeed', () => {
    expect(getUnifiedChatFailureCopy({
      failureCode: 'quota_exceeded',
      participatingCapabilities: [],
    })).toEqual({
      label: 'Daily Chat limit reached',
      detail: 'Try again when your daily Chat allowance resets.',
    });
    expect(isUnifiedChatRunRetryable('quota_exceeded')).toBe(false);
    expect(isUnifiedChatRunRetryable('model_request_timeout')).toBe(true);
  });
});

describe('getUnifiedChatActionFailureMessage', () => {
  test('turns a stale confirmation conflict into actionable user copy', () => {
    expect(getUnifiedChatActionFailureMessage(
      new Error('stale_proposal_version'),
      'Kwilt could not apply that decision.',
    )).toBe('This review is out of date. Check the refreshed card before trying again.');
  });

  test('does not leak an unknown internal error code', () => {
    expect(getUnifiedChatActionFailureMessage(
      new Error('private_internal_code'),
      'Kwilt could not apply that decision.',
    )).toBe('Kwilt could not apply that decision.');
  });

  test('preserves a user-facing explanation', () => {
    expect(getUnifiedChatActionFailureMessage(
      new Error('Choose a household member before continuing.'),
      'Kwilt could not apply that decision.',
    )).toBe('Choose a household member before continuing.');
  });
});
