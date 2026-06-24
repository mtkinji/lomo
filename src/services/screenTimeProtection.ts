export type ScreenTimeAuthorizationStatus = 'notDetermined' | 'approved' | 'denied' | 'revoked' | 'unavailable';

export type ScreenTimeToken = {
  token: string;
  label?: string;
};

export type MeaningfulFirstQualifyingAction =
  | 'focus_session_completed'
  | 'activity_completed'
  | 'activity_progress_recorded';

export type ScreenTimeRestrictionReason =
  | 'focus_session_active'
  | 'meaningful_first_locked'
  | 'meaningful_first_bypass';

export type FocusProtectionSettings = {
  enabled: boolean;
  setupCompleted: boolean;
  lastAppliedSessionId: string | null;
  lastUpdated: string | null;
};

export type MeaningfulFirstSettings = {
  enabled: boolean;
  qualifyingActions: MeaningfulFirstQualifyingAction[];
  minFocusMinutes: number;
  unlockPolicy: { type: 'until_next_local_day' } | { type: 'duration'; minutes: number };
  currentUnlockUntilIso: string | null;
  lastQualifiedAtIso: string | null;
  setupCompleted: boolean;
  allowBypass: boolean;
  bypassMinutes: number;
  lastPromptDismissedAtIso: string | null;
  lastUpdated: string | null;
};

export type ScreenTimeProtectionSettings = {
  authorizationStatus: ScreenTimeAuthorizationStatus;
  selectedApps: ScreenTimeToken[];
  selectedCategories: ScreenTimeToken[];
  focusProtection: FocusProtectionSettings;
  meaningfulFirst: MeaningfulFirstSettings;
  setupOffer: ScreenTimeSetupOfferState;
  lastUpdated: string | null;
};

export type MeaningfulFirstQualification = {
  action: MeaningfulFirstQualifyingAction;
  occurredAt: Date;
  focusMinutes?: number | null;
};

export type ScreenTimeSetupIntent =
  | 'focus_sessions'
  | 'meaningful_first_self_control'
  | 'meaningful_first_pattern_building'
  | 'meaningful_first_parent_guided'
  | 'settings_discovery';

export type ScreenTimeSetupOfferSurface =
  | 'settings'
  | 'focus_drawer'
  | 'focus_completion'
  | 'today'
  | 'plan'
  | 'activity_detail'
  | 'scheduled_activity'
  | 'notification';

export type ScreenTimeSetupRuleDefaults = {
  realStep: boolean;
  focusSession: boolean;
};

export type ScreenTimeSetupRecoveryStep = 'ready' | 'permission' | 'permission_denied' | 'apps' | 'rules';

export type ScreenTimeSetupOfferState = {
  lastShownAtIso: string | null;
  lastDismissedAtIso: string | null;
  lastCtaTappedAtIso: string | null;
  lastNotificationScheduledAtIso: string | null;
  lastNotificationOpenedAtIso: string | null;
  shownBySurface: Partial<Record<ScreenTimeSetupOfferSurface, string>>;
  dismissedBySurface: Partial<Record<ScreenTimeSetupOfferSurface, string>>;
};

export type ScreenTimePromptSurface = 'settings' | 'today' | 'plan' | 'focusCompletion';

export const DEFAULT_FOCUS_PROTECTION_SETTINGS: FocusProtectionSettings = {
  enabled: false,
  setupCompleted: false,
  lastAppliedSessionId: null,
  lastUpdated: null,
};

export const DEFAULT_MEANINGFUL_FIRST_SETTINGS: MeaningfulFirstSettings = {
  enabled: false,
  qualifyingActions: [
    'focus_session_completed',
    'activity_completed',
    'activity_progress_recorded',
  ],
  minFocusMinutes: 10,
  unlockPolicy: { type: 'until_next_local_day' },
  currentUnlockUntilIso: null,
  lastQualifiedAtIso: null,
  setupCompleted: false,
  allowBypass: true,
  bypassMinutes: 15,
  lastPromptDismissedAtIso: null,
  lastUpdated: null,
};

export const DEFAULT_SCREEN_TIME_SETUP_OFFER_STATE: ScreenTimeSetupOfferState = {
  lastShownAtIso: null,
  lastDismissedAtIso: null,
  lastCtaTappedAtIso: null,
  lastNotificationScheduledAtIso: null,
  lastNotificationOpenedAtIso: null,
  shownBySurface: {},
  dismissedBySurface: {},
};

export const DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS: ScreenTimeProtectionSettings = {
  authorizationStatus: 'notDetermined',
  selectedApps: [],
  selectedCategories: [],
  focusProtection: DEFAULT_FOCUS_PROTECTION_SETTINGS,
  meaningfulFirst: DEFAULT_MEANINGFUL_FIRST_SETTINGS,
  setupOffer: DEFAULT_SCREEN_TIME_SETUP_OFFER_STATE,
  lastUpdated: null,
};

function validIsoOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function normalizeAuthorizationStatus(value: unknown): ScreenTimeAuthorizationStatus {
  return value === 'approved' ||
    value === 'denied' ||
    value === 'revoked' ||
    value === 'unavailable' ||
    value === 'notDetermined'
    ? value
    : 'notDetermined';
}

function normalizeTokens(value: unknown): ScreenTimeToken[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const tokens: ScreenTimeToken[] = [];
  value.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const token = (item as any).token;
    if (typeof token !== 'string' || !token.trim()) return;
    const normalized = token.trim();
    if (seen.has(normalized)) return;
    seen.add(normalized);
    const label = (item as any).label;
    tokens.push({
      token: normalized,
      ...(typeof label === 'string' && label.trim() ? { label: label.trim() } : {}),
    });
  });
  return tokens;
}

function normalizeQualifyingActions(value: unknown): MeaningfulFirstQualifyingAction[] {
  if (!Array.isArray(value)) return DEFAULT_MEANINGFUL_FIRST_SETTINGS.qualifyingActions;
  const allowed = new Set<MeaningfulFirstQualifyingAction>([
    'focus_session_completed',
    'activity_completed',
    'activity_progress_recorded',
  ]);
  const next = value.filter((item): item is MeaningfulFirstQualifyingAction => allowed.has(item));
  return next.length > 0 ? Array.from(new Set(next)) : DEFAULT_MEANINGFUL_FIRST_SETTINGS.qualifyingActions;
}

function normalizeFocusProtection(value: unknown): FocusProtectionSettings {
  const raw = value && typeof value === 'object' ? (value as any) : {};
  return {
    enabled: raw.enabled === true,
    setupCompleted: raw.setupCompleted === true,
    lastAppliedSessionId:
      typeof raw.lastAppliedSessionId === 'string' && raw.lastAppliedSessionId
        ? raw.lastAppliedSessionId
        : null,
    lastUpdated: validIsoOrNull(raw.lastUpdated),
  };
}

function normalizeMeaningfulFirst(value: unknown): MeaningfulFirstSettings {
  const raw = value && typeof value === 'object' ? (value as any) : {};
  const rawPolicy = raw.unlockPolicy && typeof raw.unlockPolicy === 'object' ? raw.unlockPolicy : null;
  const durationMinutes = Number(rawPolicy?.minutes);
  const unlockPolicy =
    rawPolicy?.type === 'duration' && Number.isFinite(durationMinutes) && durationMinutes > 0
      ? { type: 'duration' as const, minutes: Math.max(1, Math.floor(durationMinutes)) }
      : DEFAULT_MEANINGFUL_FIRST_SETTINGS.unlockPolicy;

  const minFocusRaw = Number(raw.minFocusMinutes);
  const bypassRaw = Number(raw.bypassMinutes);

  return {
    enabled: raw.enabled === true,
    qualifyingActions: normalizeQualifyingActions(raw.qualifyingActions),
    minFocusMinutes: Number.isFinite(minFocusRaw) && minFocusRaw > 0 ? Math.floor(minFocusRaw) : 10,
    unlockPolicy,
    currentUnlockUntilIso: validIsoOrNull(raw.currentUnlockUntilIso),
    lastQualifiedAtIso: validIsoOrNull(raw.lastQualifiedAtIso),
    setupCompleted: raw.setupCompleted === true,
    allowBypass: raw.allowBypass !== false,
    bypassMinutes: Number.isFinite(bypassRaw) && bypassRaw > 0 ? Math.floor(bypassRaw) : 15,
    lastPromptDismissedAtIso: validIsoOrNull(raw.lastPromptDismissedAtIso),
    lastUpdated: validIsoOrNull(raw.lastUpdated),
  };
}

function normalizeSurfaceTimestamps(value: unknown): Partial<Record<ScreenTimeSetupOfferSurface, string>> {
  if (!value || typeof value !== 'object') return {};
  const allowed = new Set<ScreenTimeSetupOfferSurface>([
    'settings',
    'focus_drawer',
    'focus_completion',
    'today',
    'plan',
    'activity_detail',
    'scheduled_activity',
    'notification',
  ]);
  const normalized: Partial<Record<ScreenTimeSetupOfferSurface, string>> = {};
  Object.entries(value as Record<string, unknown>).forEach(([surface, timestamp]) => {
    if (!allowed.has(surface as ScreenTimeSetupOfferSurface)) return;
    const iso = validIsoOrNull(timestamp);
    if (iso) normalized[surface as ScreenTimeSetupOfferSurface] = iso;
  });
  return normalized;
}

function normalizeSetupOffer(value: unknown): ScreenTimeSetupOfferState {
  const raw = value && typeof value === 'object' ? (value as any) : {};
  return {
    lastShownAtIso: validIsoOrNull(raw.lastShownAtIso),
    lastDismissedAtIso: validIsoOrNull(raw.lastDismissedAtIso),
    lastCtaTappedAtIso: validIsoOrNull(raw.lastCtaTappedAtIso),
    lastNotificationScheduledAtIso: validIsoOrNull(raw.lastNotificationScheduledAtIso),
    lastNotificationOpenedAtIso: validIsoOrNull(raw.lastNotificationOpenedAtIso),
    shownBySurface: normalizeSurfaceTimestamps(raw.shownBySurface),
    dismissedBySurface: normalizeSurfaceTimestamps(raw.dismissedBySurface),
  };
}

export function normalizeScreenTimeProtectionSettings(value: unknown): ScreenTimeProtectionSettings {
  const raw = value && typeof value === 'object' ? (value as any) : {};
  return {
    authorizationStatus: normalizeAuthorizationStatus(raw.authorizationStatus),
    selectedApps: normalizeTokens(raw.selectedApps),
    selectedCategories: normalizeTokens(raw.selectedCategories),
    focusProtection: normalizeFocusProtection(raw.focusProtection),
    meaningfulFirst: normalizeMeaningfulFirst(raw.meaningfulFirst),
    setupOffer: normalizeSetupOffer(raw.setupOffer),
    lastUpdated: validIsoOrNull(raw.lastUpdated),
  };
}

export function hasSelectedScreenTimeTargets(settings: Pick<ScreenTimeProtectionSettings, 'selectedApps' | 'selectedCategories'>): boolean {
  return settings.selectedApps.length > 0 || settings.selectedCategories.length > 0;
}

function startOfNextLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(24, 0, 0, 0);
  return next;
}

export function buildMeaningfulFirstUnlock(
  settings: ScreenTimeProtectionSettings,
  params: { now: Date; reason: 'qualified' | 'bypass' },
): MeaningfulFirstSettings {
  const meaningfulFirst = settings.meaningfulFirst;
  const unlockUntil =
    params.reason === 'bypass'
      ? new Date(params.now.getTime() + meaningfulFirst.bypassMinutes * 60_000)
      : meaningfulFirst.unlockPolicy.type === 'duration'
        ? new Date(params.now.getTime() + meaningfulFirst.unlockPolicy.minutes * 60_000)
        : startOfNextLocalDay(params.now);

  return {
    ...meaningfulFirst,
    currentUnlockUntilIso: unlockUntil.toISOString(),
    lastQualifiedAtIso: params.reason === 'qualified' ? params.now.toISOString() : meaningfulFirst.lastQualifiedAtIso,
    lastUpdated: params.now.toISOString(),
  };
}

export function isMeaningfulFirstUnlocked(settings: ScreenTimeProtectionSettings, now: Date): boolean {
  const unlockUntil = settings.meaningfulFirst.currentUnlockUntilIso;
  if (!unlockUntil) return false;
  const unlockUntilMs = Date.parse(unlockUntil);
  return Number.isFinite(unlockUntilMs) && now.getTime() < unlockUntilMs;
}

function qualifies(settings: ScreenTimeProtectionSettings, qualification: MeaningfulFirstQualification): boolean {
  const meaningfulFirst = settings.meaningfulFirst;
  if (!meaningfulFirst.enabled) return false;
  if (!meaningfulFirst.qualifyingActions.includes(qualification.action)) return false;
  if (qualification.action === 'focus_session_completed') {
    const minutes = Number(qualification.focusMinutes);
    return Number.isFinite(minutes) && minutes >= meaningfulFirst.minFocusMinutes;
  }
  return true;
}

export function recordMeaningfulFirstQualification(
  settings: ScreenTimeProtectionSettings,
  qualification: MeaningfulFirstQualification,
): ScreenTimeProtectionSettings {
  if (!qualifies(settings, qualification)) return settings;
  return {
    ...settings,
    meaningfulFirst: buildMeaningfulFirstUnlock(settings, {
      now: qualification.occurredAt,
      reason: 'qualified',
    }),
    lastUpdated: qualification.occurredAt.toISOString(),
  };
}

export function recordMeaningfulFirstBypass(
  settings: ScreenTimeProtectionSettings,
  now: Date,
): ScreenTimeProtectionSettings {
  if (!settings.meaningfulFirst.enabled || !settings.meaningfulFirst.allowBypass) return settings;
  return {
    ...settings,
    meaningfulFirst: buildMeaningfulFirstUnlock(settings, { now, reason: 'bypass' }),
    lastUpdated: now.toISOString(),
  };
}

export function getActiveRestrictionReasons(
  settings: ScreenTimeProtectionSettings,
  params: { now: Date; focusSessionActive: boolean },
): ScreenTimeRestrictionReason[] {
  if (!hasSelectedScreenTimeTargets(settings)) return [];
  if (settings.authorizationStatus !== 'approved') return [];

  const reasons: ScreenTimeRestrictionReason[] = [];
  if (settings.focusProtection.enabled && params.focusSessionActive) {
    reasons.push('focus_session_active');
  }
  if (settings.meaningfulFirst.enabled && !isMeaningfulFirstUnlocked(settings, params.now)) {
    reasons.push('meaningful_first_locked');
  }
  return reasons;
}

const PROMPT_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
const WEEKLY_SETUP_NOTIFICATION_MS = 7 * 24 * 60 * 60 * 1000;

export function getScreenTimeSetupDefaults(intent: ScreenTimeSetupIntent): ScreenTimeSetupRuleDefaults {
  if (intent === 'focus_sessions') {
    return { realStep: false, focusSession: true };
  }
  if (intent === 'settings_discovery') {
    return { realStep: false, focusSession: false };
  }
  return { realStep: true, focusSession: false };
}

export function getScreenTimeSetupRecoveryStep(settings: ScreenTimeProtectionSettings): ScreenTimeSetupRecoveryStep {
  const normalized = normalizeScreenTimeProtectionSettings(settings);
  if (normalized.authorizationStatus === 'denied' || normalized.authorizationStatus === 'revoked') {
    return 'permission_denied';
  }
  if (normalized.authorizationStatus !== 'approved') return 'permission';
  if (!hasSelectedScreenTimeTargets(normalized)) return 'apps';
  if (!normalized.meaningfulFirst.enabled && !normalized.focusProtection.enabled) return 'rules';
  return 'ready';
}

function isSetupIntentAlreadyEnabled(settings: ScreenTimeProtectionSettings, intent: ScreenTimeSetupIntent): boolean {
  if (intent === 'focus_sessions') return settings.focusProtection.enabled;
  if (intent === 'settings_discovery') {
    return settings.focusProtection.enabled || settings.meaningfulFirst.enabled;
  }
  return settings.meaningfulFirst.enabled;
}

function hasCompletedSharedScreenTimeSetup(settings: ScreenTimeProtectionSettings): boolean {
  return settings.authorizationStatus === 'approved' && hasSelectedScreenTimeTargets(settings);
}

function isSnoozed(iso: string | null | undefined, now: Date, durationMs: number): boolean {
  const normalized = validIsoOrNull(iso);
  if (!normalized) return false;
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) && now.getTime() - ms < durationMs;
}

export function shouldShowScreenTimeSetupOffer(params: {
  settings: ScreenTimeProtectionSettings;
  setupIntent: ScreenTimeSetupIntent;
  surface: ScreenTimeSetupOfferSurface;
  completedFocusSessions: number;
  realMoveDayCount: number;
  activeActivityCount: number;
  hasScheduledActivityDueSoon?: boolean;
  dismissedAtIso?: string | null;
  now: Date;
}): boolean {
  const settings = normalizeScreenTimeProtectionSettings(params.settings);
  if (params.surface !== 'settings') {
    if (settings.authorizationStatus === 'denied' || settings.authorizationStatus === 'revoked') return false;
    if (settings.authorizationStatus === 'unavailable') return false;
  }
  if (isSetupIntentAlreadyEnabled(settings, params.setupIntent)) return false;
  if (params.surface !== 'settings' && hasCompletedSharedScreenTimeSetup(settings)) return false;

  const dismissedAt =
    params.dismissedAtIso ??
    settings.setupOffer.dismissedBySurface[params.surface] ??
    settings.setupOffer.lastDismissedAtIso ??
    settings.meaningfulFirst.lastPromptDismissedAtIso;
  if (params.surface !== 'settings' && isSnoozed(dismissedAt, params.now, PROMPT_SNOOZE_MS)) {
    return false;
  }

  if (params.surface === 'settings') return true;

  if (params.surface === 'focus_drawer') {
    return params.setupIntent === 'focus_sessions' && params.activeActivityCount > 0;
  }

  if (params.surface === 'focus_completion') {
    const sawFocusDrawer =
      Boolean(settings.setupOffer.shownBySurface.focus_drawer) ||
      Boolean(settings.setupOffer.dismissedBySurface.focus_drawer);
    return (
      params.setupIntent === 'focus_sessions' &&
      params.activeActivityCount > 0 &&
      (sawFocusDrawer || params.completedFocusSessions > 1)
    );
  }

  if (params.surface === 'scheduled_activity') {
    return (
      params.hasScheduledActivityDueSoon === true &&
      params.activeActivityCount > 0 &&
      params.setupIntent !== 'focus_sessions'
    );
  }

  if (params.surface === 'today' || params.surface === 'plan' || params.surface === 'activity_detail') {
    return (
      params.setupIntent !== 'focus_sessions' &&
      params.activeActivityCount > 0 &&
      params.realMoveDayCount >= 2
    );
  }

  if (params.surface === 'notification') {
    return (
      params.setupIntent !== 'focus_sessions' &&
      params.activeActivityCount > 0 &&
      (params.realMoveDayCount >= 2 || params.hasScheduledActivityDueSoon === true) &&
      !isSnoozed(settings.setupOffer.lastNotificationScheduledAtIso, params.now, WEEKLY_SETUP_NOTIFICATION_MS)
    );
  }

  return false;
}

export function shouldScheduleScreenTimeSetupNotification(params: {
  settings: ScreenTimeProtectionSettings;
  setupIntent: ScreenTimeSetupIntent;
  notificationsAuthorized: boolean;
  realMoveDayCount: number;
  activeActivityCount: number;
  hasScheduledActivityDueSoon?: boolean;
  now: Date;
}): boolean {
  if (!params.notificationsAuthorized) return false;
  return shouldShowScreenTimeSetupOffer({
    settings: params.settings,
    setupIntent: params.setupIntent,
    surface: 'notification',
    completedFocusSessions: 0,
    realMoveDayCount: params.realMoveDayCount,
    activeActivityCount: params.activeActivityCount,
    hasScheduledActivityDueSoon: params.hasScheduledActivityDueSoon,
    now: params.now,
  });
}

export function shouldShowScreenTimeProtectionPrompt(params: {
  settings: ScreenTimeProtectionSettings;
  surface: ScreenTimePromptSurface;
  completedFocusSessions: number;
  realMoveDayCount: number;
  activeActivityCount: number;
  dismissedAtIso: string | null;
  now: Date;
}): boolean {
  return shouldShowScreenTimeSetupOffer({
    settings: params.settings,
    setupIntent: params.surface === 'focusCompletion' ? 'focus_sessions' : 'meaningful_first_self_control',
    surface: params.surface === 'focusCompletion' ? 'focus_completion' : params.surface,
    completedFocusSessions: params.completedFocusSessions,
    realMoveDayCount: params.realMoveDayCount,
    activeActivityCount: params.activeActivityCount,
    dismissedAtIso: params.dismissedAtIso,
    now: params.now,
  });
}
