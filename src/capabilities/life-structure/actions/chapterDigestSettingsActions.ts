export type ChapterDigestSettingsProjection = {
  templateId: string;
  expectedUpdatedAt: string;
  enabled: boolean;
  deliveryWeekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  emailEnabled: boolean;
  emailRecipient: string | null;
};

export type ChapterDigestSettingsSource = {
  template: { id: string; updated_at: string };
  enabled: boolean;
  deliveryWeekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  emailEnabled: boolean;
  emailRecipient: string | null;
};

export type ChapterDigestSettingsPatch = {
  enabled?: boolean;
  deliveryWeekday?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  emailEnabled?: boolean;
  emailRecipient?: string | null;
};

export class ChapterDigestSettingsConflictError extends Error {}
export class InvalidChapterDigestSettingsError extends Error {}

export function projectChapterDigestSettings(settings: ChapterDigestSettingsSource): ChapterDigestSettingsProjection {
  return {
    templateId: settings.template.id,
    expectedUpdatedAt: settings.template.updated_at,
    enabled: settings.enabled,
    deliveryWeekday: settings.deliveryWeekday,
    emailEnabled: settings.emailEnabled,
    emailRecipient: settings.emailRecipient,
  };
}

function normalizePatch(fields: ChapterDigestSettingsPatch): ChapterDigestSettingsPatch {
  const keys = Object.keys(fields);
  if (keys.length === 0 || keys.some((key) => !['enabled', 'deliveryWeekday', 'emailEnabled', 'emailRecipient'].includes(key))) {
    throw new InvalidChapterDigestSettingsError('Choose at least one supported Chapter digest setting.');
  }
  if (fields.deliveryWeekday !== undefined && (!Number.isInteger(fields.deliveryWeekday)
      || fields.deliveryWeekday < 1 || fields.deliveryWeekday > 7)) {
    throw new InvalidChapterDigestSettingsError('Choose a delivery weekday from Monday through Sunday.');
  }
  if (fields.emailRecipient !== undefined && fields.emailRecipient !== null) {
    const email = fields.emailRecipient.trim();
    if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new InvalidChapterDigestSettingsError('Enter a valid email recipient.');
    }
    return { ...fields, emailRecipient: email };
  }
  return fields;
}

export async function applyChapterDigestSettingsUpdate({ input, load, update }: {
  input: { expectedUpdatedAt: string; fields: ChapterDigestSettingsPatch };
  load: () => Promise<ChapterDigestSettingsSource | null>;
  update: (input: ChapterDigestSettingsPatch & { expectedUpdatedAt: string }) => Promise<ChapterDigestSettingsSource | null>;
}): Promise<ChapterDigestSettingsProjection> {
  const current = await load();
  if (!current || current.template.updated_at !== input.expectedUpdatedAt) {
    throw new ChapterDigestSettingsConflictError('The Chapter digest settings changed after review.');
  }
  const fields = normalizePatch(input.fields);
  const nextEmailEnabled = fields.emailEnabled ?? current.emailEnabled;
  const nextRecipient = Object.prototype.hasOwnProperty.call(fields, 'emailRecipient')
    ? fields.emailRecipient ?? null
    : current.emailRecipient;
  if (nextEmailEnabled && !nextRecipient) {
    throw new InvalidChapterDigestSettingsError('An email recipient is required before email delivery can be enabled.');
  }
  const updated = await update({ expectedUpdatedAt: input.expectedUpdatedAt, ...fields });
  if (!updated) throw new ChapterDigestSettingsConflictError('The Chapter digest settings could not be updated at the reviewed version.');
  return projectChapterDigestSettings(updated);
}
