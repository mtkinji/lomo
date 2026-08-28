import type {
  PhoneAgentPermissionKey,
  PhoneAgentStatus,
} from '../../../services/phoneAgent';

export const PHONE_AGENT_PERMISSION_KEYS = [
  'create_activities',
  'remember_relationships',
  'send_followups',
  'log_done_replies',
  'offer_drafts',
  'suggest_arc_alignment',
] as const satisfies readonly PhoneAgentPermissionKey[];

export type PhoneAgentPermissionSnapshot = Record<PhoneAgentPermissionKey, boolean>;

export type PhoneAgentSettingsBoundary = {
  load(): Promise<PhoneAgentStatus>;
  update(input: {
    phone: string;
    permissions: Record<string, boolean>;
    promptCapPerDay: number;
  }): Promise<PhoneAgentStatus>;
};

export type PhoneAgentSettingsUpdateInput = {
  expectedPromptCapPerDay: number;
  expectedPermissions: PhoneAgentPermissionSnapshot;
  fields: {
    promptCapPerDay?: number;
    permissions?: Partial<PhoneAgentPermissionSnapshot>;
  };
};

export class PhoneAgentSettingsConflictError extends Error {
  constructor() {
    super('Phone Agent settings changed after this update was reviewed.');
    this.name = 'PhoneAgentSettingsConflictError';
  }
}

export function phoneAgentPermissionSnapshot(permissions: Record<string, boolean>): PhoneAgentPermissionSnapshot {
  return Object.fromEntries(
    PHONE_AGENT_PERMISSION_KEYS.map((key) => [key, permissions[key] === true]),
  ) as PhoneAgentPermissionSnapshot;
}

function validatePermissionRecord(value: unknown, requireAll: boolean): asserts value is Partial<PhoneAgentPermissionSnapshot> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Phone Agent permissions must be an object.');
  }
  const record = value as Record<string, unknown>;
  const allowed = new Set<string>(PHONE_AGENT_PERMISSION_KEYS);
  if (Object.keys(record).some((key) => !allowed.has(key))) {
    throw new Error('Phone Agent received an unsupported permission.');
  }
  if (requireAll && PHONE_AGENT_PERMISSION_KEYS.some((key) => typeof record[key] !== 'boolean')) {
    throw new Error('Phone Agent expected permissions must include every supported permission.');
  }
  if (Object.values(record).some((enabled) => typeof enabled !== 'boolean')) {
    throw new Error('Phone Agent permissions must be true or false.');
  }
}

function validatePromptCap(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 10) {
    throw new Error('Phone Agent prompt cap must be a whole number from 0 through 10.');
  }
}

function maskedPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `••••${digits.slice(-4)}`;
}

function linkSummary(status: PhoneAgentStatus) {
  const link = status.links[0];
  if (!link) return null;
  return {
    maskedPhone: maskedPhone(link.phone),
    status: link.status,
    permissions: phoneAgentPermissionSnapshot(link.permissions),
    promptCapPerDay: link.promptCapPerDay,
    optedOutAt: link.optedOutAt,
    timeZone: link.timeZone,
  };
}

function boundedStatus(status: PhoneAgentStatus) {
  return {
    link: linkSummary(status),
    memorySummary: { ...status.memorySummary },
    recentActions: status.recentActions.slice(0, 10).map((action) => ({
      actionType: action.actionType,
      createdAt: action.createdAt,
    })),
  };
}

function permissionsMatch(left: PhoneAgentPermissionSnapshot, right: PhoneAgentPermissionSnapshot): boolean {
  return PHONE_AGENT_PERMISSION_KEYS.every((key) => left[key] === right[key]);
}

export function createPhoneAgentSettingsActions(boundary: PhoneAgentSettingsBoundary) {
  return {
    loadNativeStatus: () => boundary.load(),
    async read() {
      return boundedStatus(await boundary.load());
    },
    async update(input: PhoneAgentSettingsUpdateInput) {
      validatePromptCap(input.expectedPromptCapPerDay);
      validatePermissionRecord(input.expectedPermissions, true);
      if (!input.fields || typeof input.fields !== 'object' || Array.isArray(input.fields)) {
        throw new Error('Phone Agent settings fields must be an object.');
      }
      const fieldKeys = Object.keys(input.fields);
      if (fieldKeys.length === 0 || fieldKeys.some((key) => key !== 'promptCapPerDay' && key !== 'permissions')) {
        throw new Error('Phone Agent requires at least one supported setting change.');
      }
      if (input.fields.promptCapPerDay !== undefined) validatePromptCap(input.fields.promptCapPerDay);
      if (input.fields.permissions !== undefined) {
        validatePermissionRecord(input.fields.permissions, false);
        if (Object.keys(input.fields.permissions).length === 0) {
          throw new Error('Phone Agent requires at least one permission change.');
        }
      }

      const before = await boundary.load();
      const link = before.links[0];
      if (!link || link.status !== 'verified') throw new Error('A verified Phone Agent link is required.');
      const currentPermissions = phoneAgentPermissionSnapshot(link.permissions);
      if (link.promptCapPerDay !== input.expectedPromptCapPerDay
        || !permissionsMatch(currentPermissions, input.expectedPermissions)) {
        throw new PhoneAgentSettingsConflictError();
      }

      const nextPermissions = { ...currentPermissions, ...input.fields.permissions };
      const nextPromptCap = input.fields.promptCapPerDay ?? link.promptCapPerDay;
      const changed = nextPromptCap !== link.promptCapPerDay
        || !permissionsMatch(nextPermissions, currentPermissions);
      if (!changed) {
        return { ...linkSummary(before)!, changed: false };
      }

      const after = await boundary.update({
        phone: link.phone,
        permissions: nextPermissions,
        promptCapPerDay: nextPromptCap,
      });
      const confirmed = after.links[0];
      if (!confirmed || confirmed.status !== 'verified'
        || confirmed.promptCapPerDay !== nextPromptCap
        || !permissionsMatch(phoneAgentPermissionSnapshot(confirmed.permissions), nextPermissions)) {
        throw new Error('Phone Agent did not confirm the settings update.');
      }
      return { ...linkSummary(after)!, changed: true };
    },
  };
}
