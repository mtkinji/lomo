import { parseProfileMutationPatch } from './profileProposal';

test('accepts only the bounded legacy-compatible profile fields', () => {
  expect(parseProfileMutationPatch({ fullName: '  Andy  ', ageRange: '35-44' })).toEqual({
    fullName: 'Andy', ageRange: '35-44',
  });
  expect(parseProfileMutationPatch({ email: 'new@example.com' })).toBeNull();
  expect(parseProfileMutationPatch({ ageRange: 'about forty' })).toBeNull();
});
