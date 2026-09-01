import { formatGroundedAnswer, GROUNDED_ANSWER_RESPONSE_FORMAT, parseGroundedAnswer } from './groundedAnswer';
import { buildTurnResponseGrounding } from './turnExecutionPhase';

test('uses the Chat Completions JSON-schema envelope expected by the Kwilt proxy', () => {
  expect(GROUNDED_ANSWER_RESPONSE_FORMAT).toEqual(expect.objectContaining({
    type: 'json_schema',
    json_schema: expect.objectContaining({
      name: 'kwilt_grounded_answer',
      schema: expect.objectContaining({
        type: 'object',
        properties: expect.objectContaining({
          facts: expect.objectContaining({
            items: expect.objectContaining({
              type: 'object',
              required: ['text', 'evidence'],
            }),
          }),
        }),
      }),
    }),
  }));
});

test('parses and visibly separates facts inference and uncertainty', () => {
  const parsed = parseGroundedAnswer(JSON.stringify({
    answer: 'Friday looks like the gentlest place to start.',
    facts: [
      { text: 'The library To-do is still planned.', evidence: ['E1'] },
      { text: 'Your reading Goal is in progress.', evidence: ['E2'] },
    ],
    inference: 'Pairing them may reduce an extra trip.',
    uncertainty: 'Kwilt did not inspect your calendar.',
  }), { allowedEvidenceRefs: ['E1', 'E2'] });
  expect(parsed).not.toBeNull();
  expect(formatGroundedAnswer(parsed!)).toContain('What Kwilt found\n- The library To-do');
  expect(formatGroundedAnswer(parsed!)).toContain('What that may mean');
  expect(formatGroundedAnswer(parsed!)).toContain('Limits\nKwilt did not inspect');
  expect(formatGroundedAnswer(parsed!)).not.toMatch(/\bE[12]\b/);
});

test('rejects malformed or internal-only grounded answers', () => {
  expect(parseGroundedAnswer('{"answer":"plain"}')).toBeNull();
  expect(parseGroundedAnswer(JSON.stringify({
    answer: '<think>secret</think>', facts: [{ text: 'Known', evidence: ['E1'] }], inference: null, uncertainty: 'Limited',
  }))).toBeNull();
  expect(parseGroundedAnswer(JSON.stringify({
    answer: 'A conclusion.', facts: ['Known'], inference: null, uncertainty: 'Limited',
  }), { allowedEvidenceRefs: ['E1'] })).toBeNull();
});

test('rejects missing or unknown evidence links when Kwilt evidence exists', () => {
  const response = (evidence: string[]) => JSON.stringify({
    answer: 'A conclusion.',
    facts: [{ text: 'A claimed fact.', evidence }],
    inference: null,
    uncertainty: 'Limited to current records.',
  });

  expect(parseGroundedAnswer(response([]), { allowedEvidenceRefs: ['E1'] })).toBeNull();
  expect(parseGroundedAnswer(response(['E2']), { allowedEvidenceRefs: ['E1'] })).toBeNull();
  expect(parseGroundedAnswer(response(['E1']), { allowedEvidenceRefs: ['E1'] })).not.toBeNull();
});

test('allows an explicit no-record fact only when no evidence was retrieved', () => {
  expect(parseGroundedAnswer(JSON.stringify({
    answer: 'Kwilt could not assess the pattern yet.',
    facts: [{ text: 'No relevant Kwilt records were found.', evidence: [] }],
    inference: null,
    uncertainty: 'There is no evidence to review.',
  }), { allowedEvidenceRefs: [] })).not.toBeNull();
});

test('grounds an evidence-linked review in explanation without authorizing a mutation', () => {
  const grounding = buildTurnResponseGrounding({
    authorization: 'none', evidenceScope: 'broad', responseContract: 'evidence_linked',
  });

  expect(grounding).toContain('material observations');
  expect(grounding).toContain('observation from inference');
  expect(grounding).toContain('no action authority');
});
