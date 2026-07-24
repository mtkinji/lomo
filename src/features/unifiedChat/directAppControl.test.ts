import {
  directRecurringReminder,
  directScreenTimeControl,
  inferredGoalTargetDate,
} from './directAppControl';

describe('directRecurringReminder', () => {
  test.each([
    'Remind me every Tuesday at 8 PM to take out the trash.',
    'Remind me to take out the trash every Tuesday at 8 PM.',
    'Create a to-do called Take out the trash and remind me every Tuesday at 8 PM.',
  ])('resolves a fully specified weekly reminder: %s', (prompt) => {
    expect(directRecurringReminder(prompt)).toEqual({
      title: 'Take out the trash',
      reminderLocalTime: '20:00',
      repeatWeekdays: [2],
    });
  });

  test.each([
    'Remind me every Tuesday night to take out the trash.',
    'Remind me at 8 PM to take out the trash.',
    'What should I add to my Plan tomorrow?',
  ])('leaves incomplete or unrelated language to the normal route: %s', (prompt) => {
    expect(directRecurringReminder(prompt)).toBeNull();
  });
});

describe('directScreenTimeControl', () => {
  test.each([
    'Turn on Brawl Stars for Charlie.',
    'Let Charlie use Brawl Stars now.',
    "Enable Charlie's access to Brawl Stars.",
  ])('resolves a named app allow command for one child: %s', (prompt) => {
    expect(directScreenTimeControl(prompt)).toEqual({
      childName: 'Charlie', appName: 'Brawl Stars', desiredAccess: 'allow',
    });
  });

  test('resolves a named app block command for one child', () => {
    expect(directScreenTimeControl('Block YouTube for Charlie')).toEqual({
      childName: 'Charlie', appName: 'YouTube', desiredAccess: 'block',
    });
  });
});

describe('inferredGoalTargetDate', () => {
  test('bounds next week at the end of the next local calendar week', () => {
    const target = inferredGoalTargetDate('Create a Goal to walk every day next week', new Date(2026, 6, 23, 12));
    expect(target).not.toBeNull();
    const parsed = new Date(target!);
    expect(parsed.getDay()).toBe(0);
    expect(parsed.getDate()).toBe(2);
    expect(parsed.getMonth()).toBe(7);
    expect(parsed.getHours()).toBe(23);
  });

  test('does not invent a target date without the bounded phrase', () => {
    expect(inferredGoalTargetDate('Create a Goal to walk more', new Date(2026, 6, 23, 12))).toBeNull();
  });
});
