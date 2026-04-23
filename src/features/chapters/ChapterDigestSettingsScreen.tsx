import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  getWeeklyDigestSettings,
  updateWeeklyDigestSettings,
  type WeeklyDigestSettings,
} from '../../services/chapters';
import {
  getHealthKitAvailability,
  requestHealthKitReadPermission,
  syncYesterdayHealthDailyToSupabase,
  type HealthPermissionStatus,
} from '../../services/health/healthKit';

type Nav = NativeStackNavigationProp<MoreStackParamList, 'MoreChapterDigestSettings'>;

function describeCadence(cadence: WeeklyDigestSettings['template']['cadence'] | undefined): string {
  switch (cadence) {
    case 'weekly':
      return 'Weekly · every Monday (local time)';
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

function describeIncluded(): string {
  // Short, human summary of what the digest contains today. Kept in sync with
  // the email template (`buildChapterDigestEmail` + chapter story output) so
  // the user doesn't need to read that code to trust the email.
  return (
    'A short narrative of your week, top Arcs you showed up for, key patterns ' +
    'and forces we noticed, and a link back to the full chapter in the app.'
  );
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

  const describeHealthState = React.useCallback(
    (status: HealthPermissionStatus, enabled: boolean): string => {
      if (enabled && status === 'authorized') {
        return 'On — movement, workouts, sleep, and mindfulness can appear in future chapters.';
      }
      if (status === 'denied' || status === 'restricted') {
        return 'Off — iOS denied access. Re-enable in Settings → Privacy & Security → Health.';
      }
      if (status === 'unavailable') {
        return 'Off — Apple Health is unavailable on this device/build.';
      }
      return 'Off — allow access to include Health evidence in your weekly chapter.';
    },
    [],
  );

  const handleToggleHealth = React.useCallback(
    async (nextValue: boolean) => {
      if (healthSaving) return;

      if (!nextValue) {
        setHealthPreferences((current) => ({ ...current, enabled: false }));
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
      <PageHeader title="Chapter Settings" onPressBack={() => navigation.goBack()} />
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
            <View style={styles.card}>
              <VStack space="sm">
                <Text style={styles.sectionTitle}>Chapter Settings</Text>

                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Auto-generate my weekly chapter</Text>
                    <Text style={styles.rowSubtitle}>
                      Kwilt writes a new chapter at the end of each week.
                    </Text>
                  </View>
                  <Switch
                    value={settings.enabled}
                    onValueChange={(v) => void handleToggleAutoGenerate(v)}
                    disabled={saving}
                    trackColor={{ false: colors.shellAlt, true: colors.accent }}
                    thumbColor={colors.canvas}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Email me when a new chapter is ready</Text>
                    <Text style={styles.rowSubtitle}>
                      {settings.emailEnabled
                        ? `Sending to ${settings.emailRecipient ?? defaultEmail ?? 'your account email'}`
                        : 'Off — chapters will still appear here in the app.'}
                    </Text>
                  </View>
                  <Switch
                    value={settings.emailEnabled}
                    onValueChange={(v) => void handleToggleEmail(v)}
                    disabled={saving || !settings.enabled}
                    trackColor={{ false: colors.shellAlt, true: colors.accent }}
                    thumbColor={colors.canvas}
                  />
                </View>

                {!settings.enabled ? (
                  <Text style={styles.helperText}>
                    Turn on auto-generate to enable the email digest.
                  </Text>
                ) : null}
              </VStack>
            </View>

            <View style={styles.card}>
              <VStack space="sm">
                <Text style={styles.sectionTitle}>Schedule</Text>
                <Text style={styles.rowTitle}>{describeCadence(settings.template.cadence)}</Text>
                <Text style={styles.rowSubtitle}>
                  Timezone · {settings.template.timezone || 'device default'}
                </Text>
              </VStack>
            </View>

            <View style={styles.card}>
              <VStack space="sm">
                <Text style={styles.sectionTitle}>Apple Health</Text>
                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Include Apple Health in my chapter evidence</Text>
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
            </View>

            <View style={styles.card}>
              <VStack space="sm">
                <Text style={styles.sectionTitle}>What’s included</Text>
                <Text style={styles.rowSubtitle}>{describeIncluded()}</Text>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => {
                    void Linking.openURL('https://kwilt.app/privacy').catch(() => undefined);
                  }}
                >
                  <Text style={styles.link}>Privacy &amp; data</Text>
                </Pressable>
              </VStack>
            </View>

            <Text style={styles.footerNote}>
              More controls — cadence, tone, and filters — are on the way.
            </Text>
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
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  loadingBlock: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.canvas,
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
  rowTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  rowSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  helperText: {
    ...typography.bodySm,
    color: colors.muted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  link: {
    ...typography.bodySm,
    color: colors.accent,
  },
  footerNote: {
    ...typography.bodySm,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
