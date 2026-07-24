import { parseArcCreateInput, parseArcMutationPatch } from './arcProposal';

test('parses bounded explicit Arc fields without accepting unknown identity data', () => {
  expect(parseArcMutationPatch({
    name: '  Steady parent  ', narrative: 'Calm transitions.',
    identityStatement: 'I bring calm.', status: 'paused',
  })).toEqual({
    name: 'Steady parent', narrative: 'Calm transitions.',
    identityStatement: 'I bring calm.', status: 'paused',
  });
  expect(parseArcMutationPatch({ name: 'Parent', inferredDiagnosis: 'anxious' })).toBeNull();
  expect(parseArcMutationPatch({ status: 'deleted' })).toBeNull();
});

test('requires an explicit name for Arc creation', () => {
  expect(parseArcCreateInput({ narrative: 'I learn by making.' })).toBeNull();
  expect(parseArcCreateInput({ name: ' Curious maker ', narrative: 'I learn by making.' })).toEqual({
    name: 'Curious maker', narrative: 'I learn by making.',
  });
});
