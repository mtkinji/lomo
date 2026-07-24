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

test('removes internal Kwilt object ids from visible prose', () => {
  expect(sanitizeVisibleAssistantText(
    '- **Complete the walnut glue-up** (activity_f5897cf0-d527-42d7-8fb8-cca3640f9554)\n\nI can place that from 1–3 PM.',
  )).toBe('- **Complete the walnut glue-up**\n\nI can place that from 1–3 PM.');
});
