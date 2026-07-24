import { formatProposalReceiptSummary } from './buildWorkbenchSnapshot';

test.each([
  ['applied', 'schedule_activity', 'Call school', 'Scheduled Call school'],
  ['applied', 'reschedule_activity', 'Call school', 'Moved Call school'],
  ['applied', 'remove_activity_from_plan', 'Call school', 'Removed Call school from Plan'],
  ['undone', 'schedule_activity', 'Call school', 'Removed Call school from Plan'],
  ['undone', 'reschedule_activity', 'Call school', 'Moved Call school back'],
  ['undone', 'remove_activity_from_plan', 'Call school', 'Restored Call school to Plan'],
  ['undone', 'update_activity', 'Call school', 'Restored Call school'],
  ['applied', 'create_goal', 'Learn watercolor', 'Created Learn watercolor'],
  ['applied', 'delete_goal', 'Old goal', 'Deleted Old goal'],
  ['undone', 'create_goal', 'Learn watercolor', 'Removed Learn watercolor'],
  ['undone', 'delete_goal', 'Old goal', 'Restored Old goal'],
  ['applied', 'create_arc', 'Curious maker', 'Created Curious maker'],
  ['applied', 'update_arc', 'Steady parent', 'Updated Steady parent'],
  ['applied', 'delete_arc', 'Old identity', 'Deleted Old identity'],
  ['undone', 'create_arc', 'Curious maker', 'Removed Curious maker'],
  ['undone', 'delete_arc', 'Old identity', 'Restored Old identity'],
  ['applied', 'update_profile', 'Profile', 'Updated Profile'],
  ['undone', 'update_profile', 'Profile', 'Restored Profile'],
  ['applied', 'update_chapter_note', 'Chapter 2026-W29', 'Updated Chapter 2026-W29'],
  ['undone', 'update_chapter_note', 'Chapter 2026-W29', 'Restored Chapter 2026-W29'],
  ['applied', 'remember_relationship', 'Lily', 'Remembered Lily'],
  ['applied', 'correct_relationship', "Lily's birthday", "Corrected Lily's birthday"],
  ['applied', 'forget_relationship', 'likes dragons', 'Forgot likes dragons'],
] as const)('%s %s has a truthful receipt label', (status, operationType, title, expected) => {
  expect(formatProposalReceiptSummary(status, operationType, title)).toBe(expected);
});
