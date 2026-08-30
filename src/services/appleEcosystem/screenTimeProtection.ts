import { NativeModules, Platform } from 'react-native';
import {
  normalizeScreenTimeProtectionSettings,
  type ScreenTimeAuthorizationStatus,
  type ScreenTimeProtectionSettings,
  type ScreenTimeRestrictionReason,
  type ScreenTimeToken,
} from '../screenTimeProtection';
import {
  normalizePersonalCompositeScreenTimeRule,
  type PersonalCompositeScreenTimeRule,
} from '../../features/screen-time/domain/personalCompositeScreenTimeRule';

type ScreenTimeSelectionResult = {
  selectedApps?: ScreenTimeToken[];
  selectedCategories?: ScreenTimeToken[];
};

export type ScreenTimePrerequisiteRuleEvent = {
  kind: 'interval_started' | 'threshold_reached' | 'interval_ended';
  agreementId: string;
  policyVersion: number;
  occurredAtMs: number;
};

export type ScreenTimeShieldHandoff = {
  requestedAtMs: number;
  reason: string | null;
  restrictions: ScreenTimeShieldRestriction[];
};

export type ScreenTimeShieldRestriction = {
  restrictionId: string;
  ruleId: string;
  selectionId: string;
  reason: string;
  label: string | null;
  appliedAtMs: number;
};

type KwiltScreenTimeProtectionNativeModule = {
  getAuthorizationStatus?: () => Promise<ScreenTimeAuthorizationStatus | string>;
  requestAuthorization?: (member: 'individual' | 'child') => Promise<ScreenTimeAuthorizationStatus | string>;
  presentActivityPicker?: (json: string) => Promise<ScreenTimeSelectionResult | null | undefined>;
  transferActivitySelection?: (json: string) => Promise<boolean>;
  applyRestrictions?: (json: string) => Promise<boolean>;
  clearRestrictions?: () => Promise<boolean>;
  clearRestrictionsForSelection?: (json: string) => Promise<boolean>;
  consumePendingReviewRequest?: () => Promise<number | {
    requestedAtMs?: number;
    reason?: string;
    restrictions?: unknown;
  } | null | undefined>;
  applyPrerequisiteRule?: (json: string) => Promise<boolean>;
  clearPrerequisiteRule?: (json: string) => Promise<boolean>;
  applyPersonalUsageLimit?: (json: string) => Promise<boolean>;
  clearPersonalUsageLimit?: (json: string) => Promise<boolean>;
  applyPersonalCompositeRule?: (json: string) => Promise<boolean | PersonalCompositeActivationNativeResult>;
  clearPersonalCompositeRule?: (json: string) => Promise<boolean>;
  consumePrerequisiteRuleEvent?: () => Promise<unknown>;
};

type PersonalCompositeActivationNativeResult = {
  ok?: boolean;
  code?: string;
  message?: string;
  monitoredActivityCount?: number;
};

export type PersonalCompositeActivationFailure = {
  code: string;
  message: string | null;
  monitoredActivityCount: number | null;
};

let lastPersonalCompositeActivationFailure: PersonalCompositeActivationFailure | null = null;

export function consumeLastPersonalCompositeActivationFailure(): PersonalCompositeActivationFailure | null {
  const failure = lastPersonalCompositeActivationFailure;
  lastPersonalCompositeActivationFailure = null;
  return failure;
}

const native: KwiltScreenTimeProtectionNativeModule | undefined = (NativeModules as any)?.KwiltScreenTimeProtection;

function normalizeStatus(value: unknown): ScreenTimeAuthorizationStatus {
  return value === 'approved' ||
    value === 'denied' ||
    value === 'revoked' ||
    value === 'unavailable' ||
    value === 'notDetermined'
    ? value
    : 'unavailable';
}

export async function getScreenTimeAuthorizationStatus(): Promise<ScreenTimeAuthorizationStatus> {
  if (Platform.OS !== 'ios') return 'unavailable';
  if (!native?.getAuthorizationStatus) return 'unavailable';
  try {
    return normalizeStatus(await native.getAuthorizationStatus());
  } catch {
    return 'unavailable';
  }
}

export async function requestScreenTimeAuthorization(
  member: 'individual' | 'child' = 'individual',
): Promise<ScreenTimeAuthorizationStatus> {
  if (Platform.OS !== 'ios') return 'unavailable';
  if (!native?.requestAuthorization) return 'unavailable';
  try {
    return normalizeStatus(await native.requestAuthorization(member));
  } catch {
    return 'unavailable';
  }
}

export async function consumePendingScreenTimeReviewRequest(): Promise<number | null> {
  return (await consumePendingScreenTimeShieldHandoff())?.requestedAtMs ?? null;
}

export async function consumePendingScreenTimeShieldHandoff(): Promise<ScreenTimeShieldHandoff | null> {
  if (Platform.OS !== 'ios' || !native?.consumePendingReviewRequest) return null;
  try {
    const value = await native.consumePendingReviewRequest();
    if (value && typeof value === 'object') {
      const requestedAtMs = Number(value.requestedAtMs);
      if (!Number.isFinite(requestedAtMs) || requestedAtMs <= 0) return null;
      const restrictions = Array.isArray(value.restrictions)
        ? value.restrictions.flatMap((entry): ScreenTimeShieldRestriction[] => {
          if (!entry || typeof entry !== 'object') return [];
          const raw = entry as Record<string, unknown>;
          const restrictionId = typeof raw.restrictionId === 'string' ? raw.restrictionId.trim() : '';
          const ruleId = typeof raw.ruleId === 'string' ? raw.ruleId.trim() : '';
          const selectionId = typeof raw.selectionId === 'string' ? raw.selectionId.trim() : '';
          const reason = typeof raw.reason === 'string' ? raw.reason.trim() : '';
          const appliedAtMs = Number(raw.appliedAtMs);
          if (!restrictionId || !ruleId || !selectionId || !reason
            || !Number.isFinite(appliedAtMs) || appliedAtMs <= 0) return [];
          return [{
            restrictionId,
            ruleId,
            selectionId,
            reason,
            label: typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim() : null,
            appliedAtMs,
          }];
        })
        : [];
      return {
        requestedAtMs,
        reason: typeof value.reason === 'string' && value.reason.trim() ? value.reason.trim() : null,
        restrictions,
      };
    }
    const requestedAtMs = Number(value);
    return Number.isFinite(requestedAtMs) && requestedAtMs > 0
      ? { requestedAtMs, reason: null, restrictions: [] }
      : null;
  } catch {
    return null;
  }
}

export async function presentScreenTimeActivityPicker(
  settings: Pick<ScreenTimeProtectionSettings, 'selectedApps' | 'selectedCategories'>,
  options?: { selectionId?: string },
): Promise<ScreenTimeSelectionResult | null> {
  if (Platform.OS !== 'ios') return null;
  if (!native?.presentActivityPicker) return null;
  try {
    const normalized = normalizeScreenTimeProtectionSettings(settings);
    const result = await native.presentActivityPicker(
      JSON.stringify({
        selectedApps: normalized.selectedApps,
        selectedCategories: normalized.selectedCategories,
        selectionId: options?.selectionId,
      }),
    );
    return result ?? null;
  } catch {
    return null;
  }
}

export async function transferScreenTimeActivitySelection(params: {
  sourceSelectionId: string;
  targetSelectionId: string;
}): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (!native?.transferActivitySelection) return false;
  try {
    return Boolean(await native.transferActivitySelection(JSON.stringify(params)));
  } catch {
    return false;
  }
}

export async function applyScreenTimeRestrictions(params: {
  settings: Pick<ScreenTimeProtectionSettings, 'selectedApps' | 'selectedCategories'>;
  reasons: ScreenTimeRestrictionReason[];
  selectionId?: string;
  ruleId?: string;
  reason?: string;
  restrictionLabel?: string;
}): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (!native?.applyRestrictions) return false;
  try {
    const normalized = normalizeScreenTimeProtectionSettings(params.settings);
    return Boolean(
      await native.applyRestrictions(
        JSON.stringify({
          reasons: params.reasons,
          selectedApps: normalized.selectedApps,
          selectedCategories: normalized.selectedCategories,
          selectionId: params.selectionId,
          ruleId: params.ruleId,
          reason: params.reason,
          restrictionLabel: params.restrictionLabel,
        }),
      ),
    );
  } catch {
    return false;
  }
}

export async function clearScreenTimeRestrictionsForSelection(selectionId: string): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (!native?.clearRestrictionsForSelection) return false;
  try {
    return Boolean(await native.clearRestrictionsForSelection(JSON.stringify({ selectionId })));
  } catch {
    return false;
  }
}

export async function clearScreenTimeRestrictions(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (!native?.clearRestrictions) return false;
  try {
    return Boolean(await native.clearRestrictions());
  } catch {
    return false;
  }
}

export async function applyPersonalScreenTimeUsageLimit(params: {
  settings: Pick<ScreenTimeProtectionSettings, 'selectedApps' | 'selectedCategories'>;
  selectionId: string;
  ruleId: string;
  limitMinutes: number;
  reset: 'daily';
  restrictionLabel?: string;
}): Promise<boolean> {
  if (Platform.OS !== 'ios' || !native?.applyPersonalUsageLimit) return false;
  if (!params.selectionId.trim() || !params.ruleId.trim()
    || !Number.isInteger(params.limitMinutes)
    || params.limitMinutes < 1 || params.limitMinutes > 1440
    || params.reset !== 'daily') return false;
  try {
    const normalized = normalizeScreenTimeProtectionSettings(params.settings);
    return Boolean(await native.applyPersonalUsageLimit(JSON.stringify({
      selectedApps: normalized.selectedApps,
      selectedCategories: normalized.selectedCategories,
      selectionId: params.selectionId.trim(),
      ruleId: params.ruleId.trim(),
      limitMinutes: params.limitMinutes,
      reset: 'daily',
      restrictionLabel: params.restrictionLabel?.trim().slice(0, 80),
    })));
  } catch {
    return false;
  }
}

export async function clearPersonalScreenTimeUsageLimit(ruleId: string): Promise<boolean> {
  if (Platform.OS !== 'ios' || !native?.clearPersonalUsageLimit || !ruleId.trim()) return false;
  try {
    return Boolean(await native.clearPersonalUsageLimit(JSON.stringify({ ruleId: ruleId.trim() })));
  } catch {
    return false;
  }
}

export async function applyPersonalCompositeScreenTimeRule(
  candidate: PersonalCompositeScreenTimeRule,
  context?: {
    focusActive?: boolean;
    realStepComplete?: boolean;
    budgetConditionTruth?: Record<string, boolean>;
    activeCompositeRuleIds?: string[];
  },
): Promise<boolean> {
  if (Platform.OS !== 'ios' || !native?.applyPersonalCompositeRule) return false;
  const rule = normalizePersonalCompositeScreenTimeRule(candidate);
  if (!rule || !rule.enabled) return false;
  const firstTarget = [...rule.selectedApps, ...rule.selectedCategories][0];
  const targetCount = rule.selectedApps.length + rule.selectedCategories.length;
  const restrictionLabel = firstTarget?.label?.trim()
    || `${targetCount} app${targetCount === 1 ? '' : 's'} or categories`;
  try {
    const hostTruth = Object.fromEntries(rule.conditions.flatMap((condition) => {
      if (condition.type === 'focus_active' && context?.focusActive !== undefined) {
        return [[condition.id, context.focusActive]];
      }
      if (condition.type === 'real_step_complete' && context?.realStepComplete !== undefined) {
        return [[condition.id, context.realStepComplete]];
      }
      if (condition.type === 'budget' && context?.budgetConditionTruth?.[condition.id] !== undefined) {
        return [[condition.id, context.budgetConditionTruth[condition.id]]];
      }
      return [];
    }));
    const result = await native.applyPersonalCompositeRule(JSON.stringify({
      version: 2,
      ruleId: rule.id,
      selectionId: rule.selectionId,
      activeRuleIds: [...new Set([...(context?.activeCompositeRuleIds ?? []), rule.id])],
      connector: rule.connector,
      outcome: rule.outcome,
      conditions: rule.conditions,
      restrictionLabel: restrictionLabel.slice(0, 80),
      ...(Object.keys(hostTruth).length > 0 ? { hostTruth } : {}),
    }));
    if (result === true || (result && typeof result === 'object' && result.ok === true)) {
      lastPersonalCompositeActivationFailure = null;
      return true;
    }
    if (result && typeof result === 'object') {
      lastPersonalCompositeActivationFailure = {
        code: typeof result.code === 'string' && result.code ? result.code : 'native_activation_failed',
        message: typeof result.message === 'string' && result.message ? result.message : null,
        monitoredActivityCount: Number.isInteger(result.monitoredActivityCount)
          ? Number(result.monitoredActivityCount)
          : null,
      };
    } else {
      lastPersonalCompositeActivationFailure = {
        code: 'native_activation_failed', message: null, monitoredActivityCount: null,
      };
    }
    return false;
  } catch (error) {
    lastPersonalCompositeActivationFailure = {
      code: 'native_bridge_error',
      message: error instanceof Error ? error.message : null,
      monitoredActivityCount: null,
    };
    return false;
  }
}

export async function clearPersonalCompositeScreenTimeRule(ruleId: string): Promise<boolean> {
  if (Platform.OS !== 'ios' || !native?.clearPersonalCompositeRule || !ruleId.trim()) return false;
  try {
    return Boolean(await native.clearPersonalCompositeRule(JSON.stringify({ ruleId: ruleId.trim() })));
  } catch {
    return false;
  }
}

export async function applyScreenTimePrerequisiteRule(params: {
  agreementId: string;
  policyVersion: number;
  targetSelectionId: string;
  prerequisiteSelectionId: string;
  prerequisiteLabel: string;
  targetLabel: string;
  thresholdMinutes: number;
}): Promise<boolean> {
  if (Platform.OS !== 'ios' || !native?.applyPrerequisiteRule) return false;
  if (!params.agreementId.trim() || !params.targetSelectionId.trim()
    || !params.prerequisiteSelectionId.trim()
    || params.targetSelectionId === params.prerequisiteSelectionId
    || !Number.isInteger(params.policyVersion) || params.policyVersion < 1
    || !Number.isInteger(params.thresholdMinutes)
    || params.thresholdMinutes < 1 || params.thresholdMinutes > 1440) return false;
  try {
    return Boolean(await native.applyPrerequisiteRule(JSON.stringify({
      ...params,
      agreementId: params.agreementId.trim(),
      targetSelectionId: params.targetSelectionId.trim(),
      prerequisiteSelectionId: params.prerequisiteSelectionId.trim(),
      prerequisiteLabel: params.prerequisiteLabel.trim().slice(0, 80),
      targetLabel: params.targetLabel.trim().slice(0, 80),
    })));
  } catch {
    return false;
  }
}

export async function clearScreenTimePrerequisiteRule(agreementId: string): Promise<boolean> {
  if (Platform.OS !== 'ios' || !native?.clearPrerequisiteRule || !agreementId.trim()) return false;
  try {
    return Boolean(await native.clearPrerequisiteRule(JSON.stringify({ agreementId: agreementId.trim() })));
  } catch {
    return false;
  }
}

export async function consumeScreenTimePrerequisiteRuleEvent(): Promise<ScreenTimePrerequisiteRuleEvent | null> {
  if (Platform.OS !== 'ios' || !native?.consumePrerequisiteRuleEvent) return null;
  try {
    const value = await native.consumePrerequisiteRuleEvent();
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const event = value as Record<string, unknown>;
    if (!['interval_started', 'threshold_reached', 'interval_ended'].includes(String(event.kind))
      || typeof event.agreementId !== 'string' || !event.agreementId
      || !Number.isInteger(event.policyVersion) || Number(event.policyVersion) < 1
      || typeof event.occurredAtMs !== 'number' || !Number.isFinite(event.occurredAtMs)) return null;
    return {
      kind: event.kind as ScreenTimePrerequisiteRuleEvent['kind'],
      agreementId: event.agreementId,
      policyVersion: Number(event.policyVersion),
      occurredAtMs: event.occurredAtMs,
    };
  } catch {
    return null;
  }
}
