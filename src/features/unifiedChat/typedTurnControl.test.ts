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

test.each([
  ['Only add the first two.', 2],
  ['Keep just the first 3', 3],
  ['Only do the first one', 1],
] as const)('recognizes bounded pending-work selection: %s', (prompt, count) => {
  expect(resolveTypedTurnControl(prompt)).toEqual({ type: 'keep_pending_prefix', count });
});

test.each([
  'Only add two cups of milk',
  'Keep the first chapter short',
  'Do the first thing that comes to mind',
])('does not steal ordinary quantity language: %s', (prompt) => {
  expect(resolveTypedTurnControl(prompt)).toBeNull();
});

test.each([
  ['Move it to Friday.', 5],
  ['Reschedule that for Monday', 1],
] as const)('recognizes an exact pending Activity date correction: %s', (prompt, weekday) => {
  expect(resolveTypedTurnControl(prompt)).toEqual({ type: 'edit_pending_activity_weekday', weekday });
});

test.each(['No, the other one.', 'Actually, keep the other one'])(
  'recognizes an exact two-choice correction: %s',
  (prompt) => {
    expect(resolveTypedTurnControl(prompt)).toEqual({ type: 'keep_other_pending' });
  },
);

test.each(['Do the same for next week.', 'Same thing next week'])(
  'recognizes an exact pending create repetition: %s',
  (prompt) => {
    expect(resolveTypedTurnControl(prompt)).toEqual({ type: 'repeat_pending_next_week' });
  },
);
