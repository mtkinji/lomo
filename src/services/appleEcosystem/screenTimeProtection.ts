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

type KwiltScreenTimeProtectionNativeModule = {
  getAuthorizationStatus?: () => Promise<ScreenTimeAuthorizationStatus | string>;
  requestAuthorization?: () => Promise<ScreenTimeAuthorizationStatus | string>;
  presentActivityPicker?: (json: string) => Promise<ScreenTimeSelectionResult | null | undefined>;
  applyRestrictions?: (json: string) => Promise<boolean>;
  clearRestrictions?: () => Promise<boolean>;
  clearRestrictionsForSelection?: (json: string) => Promise<boolean>;
  consumePendingReviewRequest?: () => Promise<number | null | undefined>;
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
  if (Platform.OS !== 'ios' || !native?.consumePendingReviewRequest) return null;
  try {
    const value = Number(await native.consumePendingReviewRequest());
    return Number.isFinite(value) && value > 0 ? value : null;
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
