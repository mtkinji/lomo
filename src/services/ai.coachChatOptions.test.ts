import { resolveCoachChatMaxOutputTokens } from './ai';

describe('resolveCoachChatMaxOutputTokens', () => {
  it.each([
    [undefined, undefined],
    [1, 32],
    [96, 96],
    [1_201, 1_200],
    [96.9, 96],
  ])('bounds %s to %s', (input, expected) => {
    expect(resolveCoachChatMaxOutputTokens(input)).toBe(expected);
  });
});
