import {
  normalizeScreenTimeProtectionSettings,
  type ScreenTimeAuthorizationStatus,
  type ScreenTimeProtectionSettings,
  type ScreenTimeToken,
} from '../../services/screenTimeProtection';
import type {
  PersonalCompositeScreenTimeRule,
} from '../screen-time/domain/personalCompositeScreenTimeRule';
import type {
  PersonalCompositeRuleSummary,
} from '../screen-time/domain/personalCompositeRuleActions';
import { ClientActionPresentationCancelledError } from './executeClientActionDecision';
import type { UnifiedChatClientAction } from './types';

type Selection = {
  selectedApps?: ScreenTimeToken[];
  selectedCategories?: ScreenTimeToken[];
};

type Boundary = {
  readSettings(): ScreenTimeProtectionSettings;
  persistSettings(settings: ScreenTimeProtectionSettings): void | Promise<void>;
  requestAuthorization(member: 'individual'): Promise<ScreenTimeAuthorizationStatus>;
  presentActivityPicker(
    settings: Pick<ScreenTimeProtectionSettings, 'selectedApps' | 'selectedCategories'>,
    options: { selectionId: string },
  ): Promise<Selection | null>;
  saveRule(input: {
    rule: PersonalCompositeScreenTimeRule;
    expectedUpdatedAt: null;
    confirmed: true;
  }): Promise<PersonalCompositeRuleSummary>;
  now(): string;
};

export type PersonalScreenTimeLimitClientActionReceipt = {
  outcome: 'created_personal_screen_time_limit';
  ruleId: string;
  limitMinutes: number;
  targetLabels: string[];
  targetCount: number;
  updatedAt: string;
};

export async function executePersonalScreenTimeLimitClientAction(
  action: UnifiedChatClientAction,
  boundary: Boundary,
): Promise<PersonalScreenTimeLimitClientActionReceipt> {
  const subject = action.payload.subject;
  const limitMinutes = Number(action.payload.limitMinutes);
  if (action.actionType !== 'open_personal_screen_time_limit'
    || !subject || typeof subject !== 'object' || Array.isArray(subject)
    || (subject as Record<string, unknown>).kind !== 'self'
    || !Number.isInteger(limitMinutes) || limitMinutes < 1 || limitMinutes > 1440
    || action.payload.reset !== 'daily') {
    throw new Error('invalid_personal_screen_time_limit');
  }

  const authorizationStatus = await boundary.requestAuthorization('individual');
  const currentSettings = normalizeScreenTimeProtectionSettings(boundary.readSettings());
  await boundary.persistSettings({
    ...currentSettings,
    authorizationStatus,
    lastUpdated: boundary.now(),
  });
  if (authorizationStatus !== 'approved') {
    throw new Error('screen_time_rule_authorization_required');
  }

  const selection = await boundary.presentActivityPicker(
    { selectedApps: [], selectedCategories: [] },
    { selectionId: action.id },
  );
  const selectedApps = selection?.selectedApps ?? [];
  const selectedCategories = selection?.selectedCategories ?? [];
  if (!selection || selectedApps.length + selectedCategories.length === 0) {
    throw new ClientActionPresentationCancelledError();
  }

  const updatedAt = boundary.now();
  const summary = await boundary.saveRule({
    expectedUpdatedAt: null,
    confirmed: true,
    rule: {
      id: action.id,
      selectionId: action.id,
      selectedApps,
      selectedCategories,
      enabled: true,
      setupCompleted: true,
      connector: 'all',
      outcome: 'pause',
      conditions: [{
        id: `${action.id}:daily-usage`,
        type: 'daily_usage',
        operator: 'reaches',
        minutes: limitMinutes,
      }],
      temporaryOpenUntilIso: null,
      lastUpdated: updatedAt,
    },
  });

  return {
    outcome: 'created_personal_screen_time_limit',
    ruleId: summary.id,
    limitMinutes,
    targetLabels: summary.targetLabels,
    targetCount: selectedApps.length + selectedCategories.length,
    updatedAt: summary.updatedAt,
  };
}
