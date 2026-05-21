import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography } from '../../theme';
import { Text, VStack } from '../../ui/primitives';
import { useToastStore } from '../../store/useToastStore';
import { useAppStore } from '../../store/useAppStore';
import type { MoreStackParamList } from '../../navigation/RootNavigator';
import {
  WEEKLY_CHAPTER_DELIVERY_WEEKDAYS,
  getWeeklyDigestSettings,
  updateWeeklyDigestSettings,
  type WeeklyChapterDeliveryWeekday,
  type WeeklyDigestSettings,
} from '../../services/chapters';
import {
  clearHealthDailyFromSupabase,
  getHealthKitAvailability,
  requestHealthKitReadPermission,
  syncYesterdayHealthDailyToSupabase,
  type HealthPermissionStatus,
} from '../../services/health/healthKit';

type Nav = NativeStackNavigationProp<MoreStackParamList, 'MoreChapterDigestSettings'>;

function describeDeliveryWeekday(day: WeeklyChapterDeliveryWeekday | undefined): string {
  return WEEKLY_CHAPTER_DELIVERY_WEEKDAYS.find((item) => item.value === day)?.label ?? 'Monday';
}

function describeCadence(
  cadence: WeeklyDigestSettings['template']['cadence'] | undefined,
  deliveryWeekday: WeeklyChapterDeliveryWeekday | undefined,
): string {
  switch (cadence) {
    case 'weekly':
      return `Weekly · every ${describeDeliveryWeekday(deliveryWeekday)}`;
    case 'monthly':
      return 'Monthly · first of the month';
    case 'yearly':
      return 'Yearly';
    case 'manual':
      return 'Manual only';
    default:
      return 'Weekly';
  }
}

export function ChapterDigestSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const showToast = useToastStore((s) => s.showToast);
  const authIdentity = useAppStore((state) => state.authIdentity);
  const healthPreferences = useAppStore((state) => state.healthPreferences);
  const setHealthPreferences = useAppStore((state) => state.setHealthPreferences);
  const defaultEmail = (authIdentity?.email ?? '').trim() || null;

  const [loading, setLoading] = React.useState(true);
  const [settings, setSettings] = React.useState<WeeklyDigestSettings | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [healthSaving, setHealthSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const next = await getWeeklyDigestSettings();
      setSettings(next);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const availability = await getHealthKitAvailability();
      if (cancelled) return;
      setHealthPreferences((current) => {
        if (current.osPermissionStatus === availability.permissionStatus) return current;
        return { ...current, osPermissionStatus: availability.permissionStatus };
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [setHealthPreferences]);

  const handleToggleAutoGenerate = React.useCallback(
    async (nextValue: boolean) => {
      if (!settings || saving) return;
      setSaving(true);
      // Optimistic update so the switch doesn't feel laggy on the first tap.
      setSettings({ ...settings, enabled: nextValue });
      try {
        const updated = await updateWeeklyDigestSettings({ enabled: nextValue });
        if (!updated) {
          setSettings(settings);
          showToast({ message: 'Couldn\u2019t update setting', variant: 'danger', durationMs: 2600 });
          return;
        }
        setSettings(updated);
      } catch {
        setSettings(settings);
        showToast({ message: 'Couldn\u2019t update setting', variant: 'danger', durationMs: 2600 });
      } finally {
        setSaving(false);
      }
    },
    [saving, settings, showToast],
  );

  const handleToggleEmail = React.useCallback(
    async (nextValue: boolean) => {
      if (!settings || saving) return;

      if (nextValue && !settings.emailRecipient && !defaultEmail) {
        Alert.alert(
          'Add your email first',
          'We need a verified email to send the digest. Add one in Account settings, then come back.',
        );
        return;
      }

      setSaving(true);
      setSettings({
        ...settings,
        emailEnabled: nextValue,
        emailRecipient: nextValue ? settings.emailRecipient ?? defaultEmail : settings.emailRecipient,
      });
      try {
        const updated = await updateWeeklyDigestSettings({
          emailEnabled: nextValue,
          // On first opt-in, attach the auth email as recipient so the cron has
          // somewhere to send. If the user explicitly turns it off later we
          // keep the address on file so re-enabling is one tap, not two.
          ...(nextValue && !settings.emailRecipient && defaultEmail
            ? { emailRecipient: defaultEmail }
            : {}),
        });
        if (!updated) {
          setSettings(settings);
          showToast({ message: 'Couldn\u2019t update setting', variant: 'danger', durationMs: 2600 });
          return;
        }
        setSettings(updated);
      } catch {
        setSettings(settings);
        showToast({ message: 'Couldn\u2019t update setting', variant: 'danger', durationMs: 2600 });
      } finally {
        setSaving(false);
      }
    },
    [defaultEmail, saving, settings, showToast],
  );

  const handleChangeDeliveryWeekday = React.useCallback(
    async (deliveryWeekday: WeeklyChapterDeliveryWeekday) => {
      if (!settings || saving || settings.deliveryWeekday === deliveryWeekday) return;
      setSaving(true);
      const previous = settings;
      setSettings({ ...settings, deliveryWeekday });
      try {
        const updated = await updateWeeklyDigestSettings({ deliveryWeekday });
        if (!updated) {
          setSettings(previous);
          showToast({
            message: 'Could not update schedule. Try again in a moment.',
            variant: 'danger',
          });
          return;
        }
        setSettings(updated);
      } finally {
        setSaving(false);
      }
    },
    [saving, settings, showToast],
  );

  const describeHealthState = React.useCallback(
    (status: HealthPermissionStatus, enabled: boolean): string => {
      if (enabled && status === 'authorized') {
        return 'On · movement, workouts, sleep, and mindfulness';
      }
      if (status === 'denied' || status === 'restricted') {
        return 'Off · re-enable in iOS Health settings';
      }
      if (status === 'unavailable') {
        return 'Unavailable on this device';
      }
      return 'Off · movement, workouts, sleep, and mindfulness';
    },
    [],
  );

  const handleToggleHealth = React.useCallback(
    async (nextValue: boolean) => {
      if (healthSaving) return;

      if (!nextValue) {
        setHealthPreferences((current) => ({
          ...current,
          enabled: false,
          lastDailySyncDate: null,
          lastSyncAtIso: null,
        }));
        void clearHealthDailyFromSupabase();
        return;
      }

      setHealthSaving(true);
      try {
        const availability = await getHealthKitAvailability();
        if (!availability.available) {
          setHealthPreferences((current) => ({
            ...current,
            enabled: false,
            osPermissionStatus: availability.permissionStatus,
          }));
          Alert.alert(
            'Apple Health unavailable',
            'This build or device cannot read Apple Health data yet.',
          );
          return;
        }

        if (availability.permissionStatus === 'authorized') {
          setHealthPreferences((current) => ({
            ...current,
            enabled: true,
            osPermissionStatus: 'authorized',
          }));
          void syncYesterdayHealthDailyToSupabase();
          return;
        }

        const permission = await requestHealthKitReadPermission();
        setHealthPreferences((current) => ({
          ...current,
          enabled: permission.granted,
          osPermissionStatus: permission.permissionStatus,
        }));
        if (permission.granted) {
          void syncYesterdayHealthDailyToSupabase();
        }
      } finally {
        setHealthSaving(false);
      }
    },
    [healthSaving, setHealthPreferences],
  );

  return (
    <AppShell>
      <PageHeader title="Weekly Chapters" onPressBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading || !settings ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : (
          <VStack space="md">
            <View style={styles.masterRow}>
              <View style={styles.rowText}>
                <Text style={styles.masterTitle}>Generate weekly chapters</Text>
                <Text style={styles.rowSubtitle}>A weekly recap of what moved.</Text>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={(v) => void handleToggleAutoGenerate(v)}
                disabled={saving}
                trackColor={{ false: colors.shellAlt, true: colors.accent }}
                thumbColor={colors.canvas}
              />
            </View>

            {settings.enabled ? (
              <VStack space="sm" style={styles.settingsGroup}>
                <View style={styles.inlineSection}>
                  <Text style={styles.sectionTitle}>Schedule</Text>
                  <Text style={styles.rowTitle}>
                    {describeCadence(settings.template.cadence, settings.deliveryWeekday)}
                  </Text>
                  <Text style={styles.rowSubtitle}>
                    Timezone · {settings.template.timezone || 'device default'}
                  </Text>
                  <View style={styles.weekdayGrid} accessibilityRole="radiogroup">
                    {WEEKLY_CHAPTER_DELIVERY_WEEKDAYS.map((day) => {
                      const selected = day.value === settings.deliveryWeekday;
                      return (
                        <Pressable
                          key={day.value}
                          accessibilityRole="radio"
                          accessibilityState={{ selected, disabled: saving }}
                          accessibilityLabel={`Send Weekly Chapter on ${day.label}`}
                          disabled={saving}
                          onPress={() => void handleChangeDeliveryWeekday(day.value)}
                          style={({ pressed }) => [
                            styles.weekdayChip,
                            selected && styles.weekdayChipSelected,
                            pressed && !selected && styles.weekdayChipPressed,
                          ]}
                        >
                          <Text style={[styles.weekdayChipText, selected && styles.weekdayChipTextSelected]}>
                            {day.shortLabel}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Email me when a new chapter is ready</Text>
                    <Text style={styles.rowSubtitle}>
                      {settings.emailEnabled
                        ? settings.emailRecipient ?? defaultEmail ?? 'Account email'
                        : 'Off'}
                    </Text>
                  </View>
                  <Switch
                    value={settings.emailEnabled}
                    onValueChange={(v) => void handleToggleEmail(v)}
                    disabled={saving}
                    trackColor={{ false: colors.shellAlt, true: colors.accent }}
                    thumbColor={colors.canvas}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Use Apple Health summaries</Text>
                    <Text style={styles.rowSubtitle}>
                      {describeHealthState(
                        healthPreferences.osPermissionStatus,
                        healthPreferences.enabled,
                      )}
                    </Text>
                  </View>
                  <Switch
                    value={healthPreferences.enabled}
                    onValueChange={(v) => void handleToggleHealth(v)}
                    disabled={healthSaving}
                    trackColor={{ false: colors.shellAlt, true: colors.accent }}
                    thumbColor={colors.canvas}
                  />
                </View>
              </VStack>
            ) : null}
          </VStack>
        )}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: 176,
    gap: spacing.md,
  },
  loadingBlock: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  masterTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  settingsGroup: {
    paddingTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontFamily: typography.bodySm.fontFamily,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  inlineSection: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  rowTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  rowSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  weekdayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  weekdayChip: {
    minWidth: 44,
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.canvas,
  },
  weekdayChipPressed: {
    backgroundColor: colors.shell,
  },
  weekdayChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  weekdayChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  weekdayChipTextSelected: {
    color: colors.canvas,
  },
});
