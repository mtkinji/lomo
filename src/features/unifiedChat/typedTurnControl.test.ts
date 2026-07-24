import { resolveTypedTurnControl } from './typedTurnControl';

test.each([
  'Never mind',
  "Don't make that change.",
  'Cancel that',
  'Never mind—do not apply it.',
])('recognizes an explicit pending-work cancellation: %s', (prompt) => {
  expect(resolveTypedTurnControl(prompt)).toEqual({ type: 'cancel_pending' });
});

test.each([
  'Cancel soccer practice tomorrow',
  "Don't make that recipe too spicy",
  'What does cancel mean?',
])('does not steal ordinary requests: %s', (prompt) => {
  expect(resolveTypedTurnControl(prompt)).toBeNull();
});
