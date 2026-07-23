type ReminderPickerDefaultParams = {
  reminderAt?: string | null;
  now?: Date;
};

type DueDatePickerDefaultParams = {
  scheduledDate?: string | null;
  now?: Date;
};

export function resolveInitialReminderDateTimeForPicker({
  reminderAt,
  now = new Date(),
}: ReminderPickerDefaultParams): Date {
  if (reminderAt) return new Date(reminderAt);

  const base = new Date(now);
  base.setMinutes(0, 0, 0);
  base.setHours(base.getHours() + 1);
  return base;
}

export function resolveInitialDueDateForPicker({
  scheduledDate,
  now = new Date(),
}: DueDatePickerDefaultParams): Date {
  if (scheduledDate) {
    const parsed = new Date(scheduledDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date(now);
}
