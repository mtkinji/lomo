import {
  DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
  buildMeaningfulFirstUnlock,
  getActiveRestrictionReasons,
  getScreenTimeSetupDefaults,
  getScreenTimeSetupRecoveryStep,
  isMeaningfulFirstUnlocked,
  normalizeScreenTimeProtectionSettings,
  recordMeaningfulFirstQualification,
  shouldScheduleScreenTimeSetupNotification,
  shouldShowScreenTimeSetupOffer,
  shouldShowScreenTimeProtectionPrompt,
  type ScreenTimeProtectionSettings,
} from './screenTimeProtection';

const dayStart = new Date('2026-06-19T08:00:00.000Z');

function base(overrides: Partial<ScreenTimeProtectionSettings> = {}): ScreenTimeProtectionSettings {
  return normalizeScreenTimeProtectionSettings({
    ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
    ...overrides,
  });
}

describe('screenTimeProtection.normalizeScreenTimeProtectionSettings', () => {
  it('keeps a shared app selection and fills missing mode defaults', () => {
    const settings = normalizeScreenTimeProtectionSettings({
      authorizationStatus: 'approved',
      selectedApps: [{ token: 'instagram', label: 'Instagram' }],
      meaningfulFirst: { enabled: true },
    });

    expect(settings.authorizationStatus).toBe('approved');
    expect(settings.selectedApps).toEqual([{ token: 'instagram', label: 'Instagram' }]);
    expect(settings.focusProtection.enabled).toBe(false);
    expect(settings.meaningfulFirst.enabled).toBe(true);
    expect(settings.meaningfulFirst.unlockPolicy).toEqual({ type: 'until_next_local_day' });
    expect(settings.meaningfulFirst.minFocusMinutes).toBe(10);
    expect(settings.meaningfulFirst.bypassMinutes).toBe(15);
    expect(settings.setupOffer.lastDismissedAtIso).toBeNull();
  });

  it('drops invalid persisted unlock state instead of treating it as active', () => {
    const settings = normalizeScreenTimeProtectionSettings({
      meaningfulFirst: {
        enabled: true,
        currentUnlockUntilIso: 'not-a-date',
      },
    });

    expect(settings.meaningfulFirst.currentUnlockUntilIso).toBeNull();
  });
});

describe('screenTimeProtection setup defaults and recovery', () => {
  it('defaults Focus entries to Focus-only blocking and meaningful-first entries to real-step blocking', () => {
    expect(getScreenTimeSetupDefaults('focus_sessions')).toEqual({
      focusSession: true,
      realStep: false,
    });
    expect(getScreenTimeSetupDefaults('meaningful_first_self_control')).toEqual({
      focusSession: false,
      realStep: true,
    });
    expect(getScreenTimeSetupDefaults('meaningful_first_pattern_building')).toEqual({
      focusSession: false,
      realStep: true,
    });
    expect(getScreenTimeSetupDefaults('meaningful_first_parent_guided')).toEqual({
      focusSession: false,
      realStep: true,
    });
    expect(getScreenTimeSetupDefaults('settings_discovery')).toEqual({
      focusSession: false,
      realStep: false,
    });
  });

  it('returns the next incomplete setup step for partial setup recovery', () => {
    expect(getScreenTimeSetupRecoveryStep(base())).toBe('permission');
    expect(getScreenTimeSetupRecoveryStep(base({ authorizationStatus: 'denied' }))).toBe('permission_denied');
    expect(getScreenTimeSetupRecoveryStep(base({ authorizationStatus: 'approved' }))).toBe('apps');
    expect(
      getScreenTimeSetupRecoveryStep(
        base({
          authorizationStatus: 'approved',
          selectedApps: [{ token: 'youtube', label: 'YouTube' }],
        }),
      ),
    ).toBe('rules');
    expect(
      getScreenTimeSetupRecoveryStep(
        base({
          authorizationStatus: 'approved',
          selectedApps: [{ token: 'youtube', label: 'YouTube' }],
          meaningfulFirst: { enabled: true },
        } as any),
      ),
    ).toBe('ready');
  });
});

describe('screenTimeProtection setup offers', () => {
  it('shows the Focus drawer offer before Focus starts without requiring prior Focus completions', () => {
    expect(
      shouldShowScreenTimeSetupOffer({
        settings: base(),
        setupIntent: 'focus_sessions',
        surface: 'focus_drawer',
        completedFocusSessions: 0,
        realMoveDayCount: 0,
        activeActivityCount: 1,
        now: dayStart,
      }),
    ).toBe(true);
  });

  it('suppresses contextual offers after shared Screen Time setup is complete', () => {
    const configured = base({
      authorizationStatus: 'approved',
      selectedApps: [{ token: 'youtube', label: 'YouTube' }],
    });

    expect(
      shouldShowScreenTimeSetupOffer({
        settings: configured,
        setupIntent: 'focus_sessions',
        surface: 'focus_drawer',
        completedFocusSessions: 0,
        realMoveDayCount: 0,
        activeActivityCount: 1,
        now: dayStart,
      }),
    ).toBe(false);

    expect(
      shouldShowScreenTimeSetupOffer({
        settings: configured,
        setupIntent: 'meaningful_first_self_control',
        surface: 'today',
        completedFocusSessions: 0,
        realMoveDayCount: 2,
        activeActivityCount: 1,
        now: dayStart,
      }),
    ).toBe(false);
  });

  it('shows Focus completion fallback after the drawer was dismissed or after multiple completions', () => {
    expect(
      shouldShowScreenTimeSetupOffer({
        settings: base(),
        setupIntent: 'focus_sessions',
        surface: 'focus_completion',
        completedFocusSessions: 1,
        realMoveDayCount: 0,
        activeActivityCount: 1,
        now: dayStart,
      }),
    ).toBe(false);

    expect(
      shouldShowScreenTimeSetupOffer({
        settings: base({
          setupOffer: {
            dismissedBySurface: { focus_drawer: '2026-06-18T08:00:00.000Z' },
          },
        } as any),
        setupIntent: 'focus_sessions',
        surface: 'focus_completion',
        completedFocusSessions: 1,
        realMoveDayCount: 0,
        activeActivityCount: 1,
        now: new Date('2026-07-25T08:00:00.000Z'),
      }),
    ).toBe(true);

    expect(
      shouldShowScreenTimeSetupOffer({
        settings: base(),
        setupIntent: 'focus_sessions',
        surface: 'focus_completion',
        completedFocusSessions: 2,
        realMoveDayCount: 0,
        activeActivityCount: 1,
        now: dayStart,
      }),
    ).toBe(true);
  });

  it('offers self-control after real progress on two days and scheduled setup near due work', () => {
    expect(
      shouldShowScreenTimeSetupOffer({
        settings: base(),
        setupIntent: 'meaningful_first_self_control',
        surface: 'today',
        completedFocusSessions: 0,
        realMoveDayCount: 1,
        activeActivityCount: 2,
        now: dayStart,
      }),
    ).toBe(false);

    expect(
      shouldShowScreenTimeSetupOffer({
        settings: base(),
        setupIntent: 'meaningful_first_self_control',
        surface: 'today',
        completedFocusSessions: 0,
        realMoveDayCount: 2,
        activeActivityCount: 2,
        now: dayStart,
      }),
    ).toBe(true);

    expect(
      shouldShowScreenTimeSetupOffer({
        settings: base(),
        setupIntent: 'meaningful_first_self_control',
        surface: 'scheduled_activity',
        completedFocusSessions: 0,
        realMoveDayCount: 0,
        activeActivityCount: 1,
        hasScheduledActivityDueSoon: true,
        now: dayStart,
      }),
    ).toBe(true);
  });

  it('suppresses contextual setup offers for enabled rules, revoked access, and cooldowns', () => {
    const dismissedAt = new Date('2026-06-01T08:00:00.000Z').toISOString();

    expect(
      shouldShowScreenTimeSetupOffer({
        settings: base({ meaningfulFirst: { enabled: true } } as any),
        setupIntent: 'meaningful_first_pattern_building',
        surface: 'today',
        completedFocusSessions: 0,
        realMoveDayCount: 2,
        activeActivityCount: 1,
        now: dayStart,
      }),
    ).toBe(false);

    expect(
      shouldShowScreenTimeSetupOffer({
        settings: base({ authorizationStatus: 'revoked' }),
        setupIntent: 'meaningful_first_pattern_building',
        surface: 'today',
        completedFocusSessions: 0,
        realMoveDayCount: 2,
        activeActivityCount: 1,
        now: dayStart,
      }),
    ).toBe(false);

    expect(
      shouldShowScreenTimeSetupOffer({
        settings: base({ setupOffer: { lastDismissedAtIso: dismissedAt } } as any),
        setupIntent: 'meaningful_first_pattern_building',
        surface: 'today',
        completedFocusSessions: 0,
        realMoveDayCount: 2,
        activeActivityCount: 1,
        now: new Date('2026-06-15T08:00:00.000Z'),
      }),
    ).toBe(false);
  });

  it('gates weekly setup notifications on permission and one-per-week cooldown', () => {
    expect(
      shouldScheduleScreenTimeSetupNotification({
        settings: base(),
        setupIntent: 'meaningful_first_self_control',
        notificationsAuthorized: false,
        realMoveDayCount: 2,
        activeActivityCount: 1,
        now: dayStart,
      }),
    ).toBe(false);

    expect(
      shouldScheduleScreenTimeSetupNotification({
        settings: base(),
        setupIntent: 'meaningful_first_self_control',
        notificationsAuthorized: true,
        realMoveDayCount: 2,
        activeActivityCount: 1,
        now: dayStart,
      }),
    ).toBe(true);

    expect(
      shouldScheduleScreenTimeSetupNotification({
        settings: base({
          setupOffer: {
            lastNotificationScheduledAtIso: '2026-06-17T08:00:00.000Z',
          },
        } as any),
        setupIntent: 'meaningful_first_self_control',
        notificationsAuthorized: true,
        realMoveDayCount: 2,
        activeActivityCount: 1,
        now: dayStart,
      }),
    ).toBe(false);
  });
});

describe('screenTimeProtection meaningful-first unlocks', () => {
  it('unlocks until the next local day for a qualifying action', () => {
    const settings = base({
      meaningfulFirst: {
        enabled: true,
        qualifyingActions: ['activity_completed'],
      },
    } as any);

    const next = recordMeaningfulFirstQualification(settings, {
      action: 'activity_completed',
      occurredAt: dayStart,
    });
    const expectedUnlock = new Date(dayStart);
    expectedUnlock.setHours(24, 0, 0, 0);

    expect(next.meaningfulFirst.lastQualifiedAtIso).toBe(dayStart.toISOString());
    expect(next.meaningfulFirst.currentUnlockUntilIso).toBe(expectedUnlock.toISOString());
    expect(isMeaningfulFirstUnlocked(next, new Date(expectedUnlock.getTime() - 60_000))).toBe(true);
    expect(isMeaningfulFirstUnlocked(next, expectedUnlock)).toBe(false);
  });

  it('does not unlock for non-configured actions or short focus sessions', () => {
    const settings = base({
      meaningfulFirst: {
        enabled: true,
        minFocusMinutes: 15,
        qualifyingActions: ['focus_session_completed'],
      },
    } as any);

    const afterActivity = recordMeaningfulFirstQualification(settings, {
      action: 'activity_completed',
      occurredAt: dayStart,
    });
    const afterShortFocus = recordMeaningfulFirstQualification(settings, {
      action: 'focus_session_completed',
      occurredAt: dayStart,
      focusMinutes: 10,
    });

    expect(afterActivity).toBe(settings);
    expect(afterShortFocus).toBe(settings);
  });

  it('supports temporary bypass without marking the day qualified', () => {
    const settings = base({
      meaningfulFirst: { enabled: true },
    } as any);
    const bypass = buildMeaningfulFirstUnlock(settings, {
      now: dayStart,
      reason: 'bypass',
    });

    expect(bypass.lastQualifiedAtIso).toBeNull();
    expect(bypass.currentUnlockUntilIso).toBe('2026-06-19T08:15:00.000Z');
  });
});

describe('screenTimeProtection restriction reconciliation', () => {
  it('keeps focus and meaningful-first reasons independent', () => {
    const settings = base({
      authorizationStatus: 'approved',
      selectedApps: [{ token: 'youtube', label: 'YouTube' }],
      focusProtection: { enabled: true },
      meaningfulFirst: { enabled: true, currentUnlockUntilIso: null },
    } as any);

    expect(
      getActiveRestrictionReasons(settings, {
        now: dayStart,
        focusSessionActive: true,
      }),
    ).toEqual(['focus_session_active', 'meaningful_first_locked']);

    expect(
      getActiveRestrictionReasons(settings, {
        now: dayStart,
        focusSessionActive: false,
      }),
    ).toEqual(['meaningful_first_locked']);
  });

  it('does not require shielding when no apps are selected', () => {
    const settings = base({
      authorizationStatus: 'approved',
      selectedApps: [],
      selectedCategories: [],
      focusProtection: { enabled: true },
      meaningfulFirst: { enabled: true },
    } as any);

    expect(getActiveRestrictionReasons(settings, { now: dayStart, focusSessionActive: true })).toEqual([]);
  });

  it('waits for Screen Time approval before returning active reasons', () => {
    const settings = base({
      authorizationStatus: 'notDetermined',
      selectedApps: [{ token: 'youtube', label: 'YouTube' }],
      focusProtection: { enabled: true },
      meaningfulFirst: { enabled: true },
    } as any);

    expect(getActiveRestrictionReasons(settings, { now: dayStart, focusSessionActive: true })).toEqual([]);
  });
});

describe('screenTimeProtection prompting', () => {
  it('waits until the user has real Kwilt context before offering Meaningful First', () => {
    const settings = base();

    expect(
      shouldShowScreenTimeProtectionPrompt({
        settings,
        surface: 'today',
        completedFocusSessions: 0,
        realMoveDayCount: 1,
        activeActivityCount: 3,
        dismissedAtIso: null,
        now: dayStart,
      }),
    ).toBe(false);

    expect(
      shouldShowScreenTimeProtectionPrompt({
        settings,
        surface: 'today',
        completedFocusSessions: 0,
        realMoveDayCount: 2,
        activeActivityCount: 3,
        dismissedAtIso: null,
        now: dayStart,
      }),
    ).toBe(true);
  });

  it('suppresses contextual prompts after dismissal or permission denial', () => {
    const dismissedAt = new Date('2026-06-01T08:00:00.000Z').toISOString();
    const denied = base({ authorizationStatus: 'denied' });

    expect(
      shouldShowScreenTimeProtectionPrompt({
        settings: base(),
        surface: 'today',
        completedFocusSessions: 2,
        realMoveDayCount: 3,
        activeActivityCount: 3,
        dismissedAtIso: dismissedAt,
        now: new Date('2026-06-15T08:00:00.000Z'),
      }),
    ).toBe(false);

    expect(
      shouldShowScreenTimeProtectionPrompt({
        settings: denied,
        surface: 'today',
        completedFocusSessions: 2,
        realMoveDayCount: 3,
        activeActivityCount: 3,
        dismissedAtIso: null,
        now: dayStart,
      }),
    ).toBe(false);
  });
});
