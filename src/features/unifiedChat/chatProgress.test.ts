import { getUnifiedChatProgressCopy } from './chatProgress';

describe('getUnifiedChatProgressCopy', () => {
  test('keeps the initial and drafting phases short and user-legible', () => {
    expect(getUnifiedChatProgressCopy({ phase: 'understanding', participatingCapabilities: [] }))
      .toBe('Understanding your request');
    expect(getUnifiedChatProgressCopy({ phase: 'drafting', participatingCapabilities: ['todos'] }))
      .toBe('Drafting your response');
  });

  test.each([
    ['todos', 'Checking your to-dos'],
    ['goals', 'Checking your goals'],
    ['plan', 'Checking your plan'],
    ['money', 'Checking your money'],
  ] as const)('names one relevant capability while checking %s', (capability, expected) => {
    expect(getUnifiedChatProgressCopy({
      phase: 'checking',
      participatingCapabilities: [capability],
    })).toBe(expected);
  });

  test('stays broad when several capabilities are involved', () => {
    expect(getUnifiedChatProgressCopy({
      phase: 'checking',
      participatingCapabilities: ['goals', 'plan'],
    })).toBe('Checking what matters');
  });
});
