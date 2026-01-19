import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { ObjectPicker } from '../../ui/ObjectPicker';
import { ButtonLabel, HStack, Text, VStack } from '../../ui/primitives';
import { ensureSignedInWithPrompt } from '../../services/backend/auth';
import {
  disconnectCalendarAccount,
  listCalendarAccounts,
  listCalendars,
  getCalendarPreferences,
  startCalendarConnect,
  updateCalendarPreferences,
  type CalendarAccount,
  type CalendarListItem,
  type CalendarRef,
} from '../../services/plan/calendarApi';
import { useToastStore } from '../../store/useToastStore';

function encodeCalendarValue(ref: CalendarRef): string {
  return `${ref.provider}:${ref.accountId}:${ref.calendarId}`;
}

function decodeCalendarValue(value: string): CalendarRef | null {
  const parts = value.split(':');
  if (parts.length < 3) return null;
  const provider = parts[0] === 'google' || parts[0] === 'microsoft' ? parts[0] : null;
  if (!provider) return null;
  const accountId = parts[1] ?? '';
  // Calendar IDs can contain ':' (e.g. some Google calendars), so join the rest.
  const calendarId = parts.slice(2).join(':');
  if (!accountId || !calendarId) return null;
  return { provider, accountId, calendarId };
}

export function PlanCalendarSettingsScreen() {
  const navigation = useNavigation();
  const showToast = useToastStore((s) => s.showToast);
  const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
  const [calendars, setCalendars] = useState<CalendarListItem[]>([]);
  const [readRefs, setReadRefs] = useState<CalendarRef[]>([]);
  const [writeRef, setWriteRef] = useState<CalendarRef | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [disconnectingAccountKey, setDisconnectingAccountKey] = useState<string | null>(null);

  const refreshAll = async () => {
    await ensureSignedInWithPrompt('settings');
    // Important: tolerate provider-specific calendar errors so the user can still
    // see/manage connected accounts (e.g. disconnect a broken token).
    const [acct, prefs] = await Promise.all([listCalendarAccounts(), getCalendarPreferences()]);
    setAccounts(acct);
    setReadRefs(prefs.readCalendarRefs ?? []);
    setWriteRef(prefs.writeCalendarRef ?? null);

    try {
      const cal = await listCalendars();
      setCalendars(cal);
    } catch (err: any) {
      setCalendars([]);
      const msg =
        typeof err?.message === 'string' && err.message.trim().length > 0 ? err.message : 'Unable to list calendars';
      showToast({ message: msg, variant: 'danger', durationMs: 7000 });
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refreshAll();
      } catch (err: any) {
        if (!mounted) return;
        showToast({
          message: typeof err?.message === 'string' ? err.message : 'Unable to load calendars',
          variant: 'danger',
        });
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener('url', async (evt) => {
      if (evt?.url?.includes('calendar-auth')) {
        let status: string | null = null;
        let reason: string | null = null;
        try {
          const u = new URL(evt.url);
          status = u.searchParams.get('status');
          reason = u.searchParams.get('reason');
        } catch {
          // ignore
        }
        try {
          await refreshAll();
        } catch (err: any) {
          const msg = typeof err?.message === 'string' ? err.message : 'Unable to refresh calendars';
          Alert.alert('Calendar refresh failed', msg, [{ text: 'OK' }]);
          showToast({ message: msg, variant: 'danger', durationMs: 7000 });
          return;
        }
        if (status === 'error') {
          Alert.alert('Calendar connect failed', reason ?? 'Unknown error', [{ text: 'OK' }]);
          showToast({
            message: `Calendar connect failed${reason ? `: ${reason}` : ''}`,
            variant: 'danger',
            durationMs: 7000,
          });
          return;
        }
        showToast({ message: 'Calendar connected', variant: 'success' });
      }
    });
    return () => sub.remove();
  }, []);

  const handleConnect = async (provider: 'google' | 'microsoft') => {
    try {
      await ensureSignedInWithPrompt('settings');
      const { authUrl } = await startCalendarConnect(provider);
      await Linking.openURL(authUrl);
    } catch (err: any) {
      Alert.alert('Unable to connect', typeof err?.message === 'string' ? err.message : 'Please try again.');
    }
  };

  const providerLabel = (provider: CalendarAccount['provider']) => (provider === 'google' ? 'Google' : 'Outlook');

  const handleDisconnect = async (account: CalendarAccount) => {
    const key = `${account.provider}:${account.accountId}`;
    setDisconnectingAccountKey(key);
    try {
      await ensureSignedInWithPrompt('settings');
      await disconnectCalendarAccount({ provider: account.provider, accountId: account.accountId });
      await refreshAll();
      showToast({ message: 'Calendar account disconnected', variant: 'success' });
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : 'Unable to disconnect account';
      Alert.alert('Disconnect failed', msg, [{ text: 'OK' }]);
      showToast({ message: msg, variant: 'danger' });
    } finally {
      setDisconnectingAccountKey((cur) => (cur === key ? null : cur));
    }
  };

  const confirmDisconnect = (account: CalendarAccount) => {
    const label = providerLabel(account.provider);
    const name = (account.displayName || account.email || '').trim();
    const target = name ? `${label} (${name})` : label;
    Alert.alert(
      'Disconnect account?',
      `Are you sure you want to disconnect ${target}? Kwilt will stop reading busy time and writing commitments for this account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => void handleDisconnect(account) },
      ],
    );
  };

  const isReadSelected = (ref: CalendarRef) =>
    readRefs.some(
      (r) => r.provider === ref.provider && r.accountId === ref.accountId && r.calendarId === ref.calendarId,
    );

  const toggleReadCalendar = async (ref: CalendarRef) => {
    const next = isReadSelected(ref)
      ? readRefs.filter(
          (r) => !(r.provider === ref.provider && r.accountId === ref.accountId && r.calendarId === ref.calendarId),
        )
      : [...readRefs, ref];
    setReadRefs(next);
    await updateCalendarPreferences({ readCalendarRefs: next, writeCalendarRef: writeRef });
  };

  const selectWriteCalendar = async (ref: CalendarRef) => {
    setWriteRef(ref);
    await updateCalendarPreferences({ readCalendarRefs: readRefs, writeCalendarRef: ref });
  };

  const clearWriteCalendar = async () => {
    setWriteRef(null);
    await updateCalendarPreferences({ readCalendarRefs: readRefs, writeCalendarRef: null });
  };

  const accountLabelByKey = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) {
      const accountLabel = (a.email || a.displayName || a.accountId || '').trim() || 'Account';
      // Keep this minimal (account only). Provider is shown elsewhere when needed.
      m.set(`${a.provider}:${a.accountId}`, accountLabel);
    }
    return m;
  }, [accounts]);

  const calendarNameCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of calendars) {
      const key = (c.name ?? '').trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [calendars]);

  const calendarNameProviderCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of calendars) {
      const name = (c.name ?? '').trim();
      if (!name) continue;
      const key = `${name}||${c.provider}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [calendars]);

  const getCalendarName = React.useCallback((c: CalendarListItem) => {
    return (c.name ?? '').trim() || c.calendarId;
  }, []);

  const getCalendarContextLabel = React.useCallback(
    (c: CalendarListItem, opts?: { includeShared?: boolean; includeOwnerHint?: boolean }) => {
      const includeShared = opts?.includeShared ?? true;
      const includeOwnerHint = opts?.includeOwnerHint ?? true;
      const parts: string[] = [];
      if (includeShared && c.shared) parts.push('Shared');
      if (includeOwnerHint && c.ownerHint) parts.push(c.ownerHint);
      // Role clarity
      if (c.canWrite === false) parts.push('Read-only');
      else if (c.shared && c.canWrite === true) parts.push('Can edit');
      // Provider flags
      if (c.provider === 'google' && c.primary) parts.push('Primary');
      if (c.provider === 'microsoft' && c.isDefault) parts.push('Default');
      if (c.hidden) parts.push('Hidden');
      // If the alias differs from the underlying name, show that too.
      if (c.provider === 'google' && c.aliasName && c.originalName && c.aliasName !== c.originalName) {
        parts.push(`Also called: ${c.originalName}`);
      }
      return parts.join(' • ');
    },
    [],
  );

  const writeCalendarOptions = React.useMemo(() => {
    return calendars
      .filter((c) => c.canWrite !== false)
      .map((c) => {
      const label = getCalendarName(c);
      const accountLabel = accountLabelByKey.get(`${c.provider}:${c.accountId}`) ?? 'Account';
      const flags: string[] = [];
      const context = getCalendarContextLabel(c);
      if (context) flags.push(context);
      const meta = flags.length > 0 ? ` • ${flags.join(' • ')}` : '';
      const subtitle = `${accountLabel}${meta}`;
      return {
        value: encodeCalendarValue(c),
        label,
        subtitle,
        keywords: [label, accountLabel, c.ownerHint ?? '', c.accountId, c.calendarId],
        leftElement: (
          <Icon
            name={c.provider === 'google' ? 'google' : 'outlook'}
            size={16}
            color={colors.textSecondary}
          />
        ),
      };
    });
  }, [accountLabelByKey, calendars, getCalendarContextLabel, getCalendarName]);

  const writePickerValue = React.useMemo(() => {
    return writeRef ? encodeCalendarValue(writeRef) : '';
  }, [writeRef]);

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="Calendars" onPressBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.helperText}>
            Choose which calendars count as busy time and where Plan should write commitments.
          </Text>
          <View style={styles.card}>
            <VStack space="sm">
              <Text style={styles.cardTitle}>Connected accounts</Text>
              <HStack space="sm">
                <Button variant="secondary" size="sm" onPress={() => handleConnect('google')}>
                  Connect Google
                </Button>
                <Button variant="secondary" size="sm" onPress={() => handleConnect('microsoft')}>
                  Connect Outlook
                </Button>
              </HStack>
              {accounts.length === 0 ? (
                <Text style={styles.cardSubtitle}>No accounts connected yet.</Text>
              ) : (
                accounts.map((account) => (
                  <View key={`${account.provider}-${account.accountId}`} style={styles.row}>
                    <HStack alignItems="center" space="sm">
                      <Icon name={account.provider === 'google' ? 'google' : 'outlook'} size={16} color={colors.textSecondary} />
                      <Text style={styles.rowTitle}>
                        {account.displayName || account.email || account.accountId}
                      </Text>
                    </HStack>
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => confirmDisconnect(account)}
                      disabled={disconnectingAccountKey === `${account.provider}:${account.accountId}`}
                      accessibilityLabel={`Disconnect ${providerLabel(account.provider)} account`}
                    >
                      <ButtonLabel tone="destructive">Disconnect</ButtonLabel>
                    </Button>
                  </View>
                ))
              )}
            </VStack>
          </View>

          <View style={styles.card}>
            <VStack space="sm">
              <Text style={styles.cardTitle}>Read calendars</Text>
              {calendars.length === 0 ? (
                <Text style={styles.cardSubtitle}>
                  {isLoading
                    ? 'Loading calendars…'
                    : 'Connect an account (above) to choose which calendars count as busy time.'}
                </Text>
              ) : (
                <>
                  <Text style={styles.cardSubtitle}>
                    Selected calendars count as busy time when Plan finds open slots.
                  </Text>
                  {calendars.map((cal) => {
                    const selected = isReadSelected(cal);
                    const baseTitle = getCalendarName(cal);
                    // For shared calendars: show the alias (what Google shows for the user) if available.
                    // If no alias exists, fall back to the calendar's actual name with a shared marker.
                    const title = cal.shared ? (cal.aliasName ?? `${baseTitle} (Shared)`) : baseTitle;
                    const baseAccountLabel = accountLabelByKey.get(`${cal.provider}:${cal.accountId}`) ?? '';
                    const flags: string[] = [];
                    const context = getCalendarContextLabel(cal, { includeShared: false, includeOwnerHint: false });
                    if (context) flags.push(context);
                    // Subtitle: for shared calendars, lead with the owner since that's what
                    // helps users recognize the calendar. For owned calendars, show the
                    // connected account email/name.
                    const subtitleBase = cal.shared
                      ? cal.ownerHint || 'Shared calendar'
                      : baseAccountLabel || providerLabel(cal.provider);
                    const accountLabel = `${subtitleBase}${flags.length > 0 ? ` • ${flags.join(' • ')}` : ''}`;
                    return (
                      <Pressable
                        key={`${cal.provider}-${cal.accountId}-${cal.calendarId}`}
                        accessibilityRole="button"
                        onPress={() => toggleReadCalendar(cal)}
                        style={styles.row}
                      >
                        <HStack alignItems="center" space="sm" style={{ flex: 1, minWidth: 0 }}>
                          <View style={[styles.colorDot, { backgroundColor: cal.color ?? colors.shellAlt }]} />
                          <VStack space="xs" style={{ flex: 1, minWidth: 0 }}>
                            <HStack alignItems="center" space="sm" style={{ flex: 1, minWidth: 0 }}>
                              <Icon
                                name={cal.provider === 'google' ? 'google' : 'outlook'}
                                size={16}
                                color={colors.textSecondary}
                              />
                              <Text style={styles.rowTitle} numberOfLines={1}>
                                {title}
                              </Text>
                            </HStack>
                            <Text style={styles.rowSubtitle} numberOfLines={1}>
                              {accountLabel}
                            </Text>
                          </VStack>
                        </HStack>
                        <Icon name={selected ? 'checkCircle' : 'dot'} size={18} color={colors.textSecondary} />
                      </Pressable>
                    );
                  })}
                </>
              )}
            </VStack>
          </View>

          <View style={styles.card}>
            <VStack space="sm">
              <Text style={styles.cardTitle}>Default write calendar</Text>
              {calendars.length === 0 ? (
                <Text style={styles.cardSubtitle}>Connect an account to choose where Kwilt writes commitments.</Text>
              ) : (
                <>
                  <Text style={styles.cardSubtitle}>
                    Kwilt will create and update commitment blocks in this calendar.
                  </Text>
                  <ObjectPicker
                    options={writeCalendarOptions}
                    value={writePickerValue}
                    onValueChange={async (nextValue) => {
                      if (!nextValue) {
                        await clearWriteCalendar();
                        return;
                      }
                      const ref = decodeCalendarValue(nextValue);
                      if (!ref) return;
                      await selectWriteCalendar(ref);
                    }}
                    placeholder="Choose a calendar…"
                    searchPlaceholder="Search calendars…"
                    emptyText="No calendars found."
                    accessibilityLabel="Choose a default write calendar"
                    allowDeselect={true}
                    presentation="drawer"
                    drawerSnapPoints={['90%']}
                  />
                  <Text style={styles.cardSubtitle}>Tip: Create a dedicated calendar like “Kwilt” to keep things tidy.</Text>
                </>
              )}
            </VStack>
          </View>
        </ScrollView>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  helperText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  cardSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  row: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  rowSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});


