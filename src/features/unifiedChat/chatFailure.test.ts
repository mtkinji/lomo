import { getUnifiedChatFailureCopy } from './chatFailure';

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
});
