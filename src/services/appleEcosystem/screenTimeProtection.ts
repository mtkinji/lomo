import { NativeModules, Platform } from 'react-native';
import {
  normalizeScreenTimeProtectionSettings,
  type ScreenTimeAuthorizationStatus,
  type ScreenTimeProtectionSettings,
  type ScreenTimeRestrictionReason,
  type ScreenTimeToken,
} from '../screenTimeProtection';

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
};

type KwiltScreenTimeProtectionNativeModule = {
  getAuthorizationStatus?: () => Promise<ScreenTimeAuthorizationStatus | string>;
  requestAuthorization?: () => Promise<ScreenTimeAuthorizationStatus | string>;
  presentActivityPicker?: (json: string) => Promise<ScreenTimeSelectionResult | null | undefined>;
  applyRestrictions?: (json: string) => Promise<boolean>;
  clearRestrictions?: () => Promise<boolean>;
  clearRestrictionsForSelection?: (json: string) => Promise<boolean>;
  consumePendingReviewRequest?: () => Promise<number | { requestedAtMs?: number; reason?: string } | null | undefined>;
  applyPrerequisiteRule?: (json: string) => Promise<boolean>;
  clearPrerequisiteRule?: (json: string) => Promise<boolean>;
  consumePrerequisiteRuleEvent?: () => Promise<unknown>;
};

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

export async function requestScreenTimeAuthorization(): Promise<ScreenTimeAuthorizationStatus> {
  if (Platform.OS !== 'ios') return 'unavailable';
  if (!native?.requestAuthorization) return 'unavailable';
  try {
    return normalizeStatus(await native.requestAuthorization());
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
      return {
        requestedAtMs,
        reason: typeof value.reason === 'string' && value.reason.trim() ? value.reason.trim() : null,
      };
    }
    const requestedAtMs = Number(value);
    return Number.isFinite(requestedAtMs) && requestedAtMs > 0
      ? { requestedAtMs, reason: null }
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

export async function applyScreenTimeRestrictions(params: {
  settings: Pick<ScreenTimeProtectionSettings, 'selectedApps' | 'selectedCategories'>;
  reasons: ScreenTimeRestrictionReason[];
  selectionId?: string;
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
