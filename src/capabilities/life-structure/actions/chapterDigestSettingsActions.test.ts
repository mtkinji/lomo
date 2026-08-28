import {
  ChapterDigestSettingsConflictError,
  applyChapterDigestSettingsUpdate,
  projectChapterDigestSettings,
} from './chapterDigestSettingsActions';

const current = {
  template: { id: 'template-1', updated_at: '2026-08-28T10:00:00.000Z' },
  enabled: true,
  emailEnabled: false,
  emailRecipient: null,
  deliveryWeekday: 1 as const,
};

test('projects only the user-facing weekly Chapter preferences and opaque version', () => {
  expect(projectChapterDigestSettings(current)).toEqual({
    templateId: 'template-1', expectedUpdatedAt: '2026-08-28T10:00:00.000Z',
    enabled: true, deliveryWeekday: 1, emailEnabled: false, emailRecipient: null,
  });
});

test('applies a validated partial patch against the reviewed version', async () => {
  const update = jest.fn(async () => ({ ...current, deliveryWeekday: 5 as const }));
  const result = await applyChapterDigestSettingsUpdate({
    input: { expectedUpdatedAt: current.template.updated_at, fields: { deliveryWeekday: 5 } },
    load: async () => current,
    update,
  });
  expect(update).toHaveBeenCalledWith({ expectedUpdatedAt: current.template.updated_at, deliveryWeekday: 5 });
  expect(result.deliveryWeekday).toBe(5);
});

test('requires a recipient when email delivery is enabled for the first time', async () => {
  await expect(applyChapterDigestSettingsUpdate({
    input: { expectedUpdatedAt: current.template.updated_at, fields: { emailEnabled: true } },
    load: async () => current,
    update: async () => current,
  })).rejects.toThrow('email recipient');
});

test('rejects stale reviewed settings', async () => {
  await expect(applyChapterDigestSettingsUpdate({
    input: { expectedUpdatedAt: 'older', fields: { enabled: false } },
    load: async () => current,
    update: async () => current,
  })).rejects.toBeInstanceOf(ChapterDigestSettingsConflictError);
});
