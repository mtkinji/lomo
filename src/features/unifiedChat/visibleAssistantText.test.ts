import { sanitizeVisibleAssistantText } from './visibleAssistantText';

test('removes hidden tags and leading internal planning while preserving the answer', () => {
  expect(sanitizeVisibleAssistantText([
    '<think>Search every private record.</think>',
    '',
    'I need to decide what the user wants.',
    '',
    'A smaller Friday plan is the safest fit.',
  ].join('\n'))).toBe('A smaller Friday plan is the safest fit.');
});
