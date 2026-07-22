import { formatGroundedAnswer, GROUNDED_ANSWER_RESPONSE_FORMAT, parseGroundedAnswer } from './groundedAnswer';

test('uses the Chat Completions JSON-schema envelope expected by the Kwilt proxy', () => {
  expect(GROUNDED_ANSWER_RESPONSE_FORMAT).toEqual(expect.objectContaining({
    type: 'json_schema',
    json_schema: expect.objectContaining({
      name: 'kwilt_grounded_answer',
      schema: expect.objectContaining({ type: 'object' }),
    }),
  }));
});

test('parses and visibly separates facts inference and uncertainty', () => {
  const parsed = parseGroundedAnswer(JSON.stringify({
    answer: 'Friday looks like the gentlest place to start.',
    facts: ['The library To-do is still planned.', 'Your reading Goal is in progress.'],
    inference: 'Pairing them may reduce an extra trip.',
    uncertainty: 'Kwilt did not inspect your calendar.',
  }));
  expect(parsed).not.toBeNull();
  expect(formatGroundedAnswer(parsed!)).toContain('What Kwilt found\n- The library To-do');
  expect(formatGroundedAnswer(parsed!)).toContain('What that may mean');
  expect(formatGroundedAnswer(parsed!)).toContain('Limits\nKwilt did not inspect');
});

test('rejects malformed or internal-only grounded answers', () => {
  expect(parseGroundedAnswer('{"answer":"plain"}')).toBeNull();
  expect(parseGroundedAnswer(JSON.stringify({
    answer: '<think>secret</think>', facts: ['Known'], inference: null, uncertainty: 'Limited',
  }))).toBeNull();
});
