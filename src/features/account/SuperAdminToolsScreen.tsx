import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { Button } from '../../ui/Button';
import { Input, KeyboardAwareScrollView, Text, VStack, HStack } from '../../ui/primitives';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { createProCodeAdmin, getAdminProCodesStatus, sendProCodeSuperAdmin } from '../../services/proCodes';
import {
  clearAdminEntitlementsOverrideTier,
  getAdminEntitlementsOverrideTier,
  setAdminEntitlementsOverrideTier,
  type AdminEntitlementsOverrideTier,
} from '../../services/entitlements';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsSuperAdminTools'>;

const oneYearFromNowIso = () => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString();
};

export function SuperAdminToolsScreen() {
  const navigation = useNavigation<Nav>();
  const [isChecking, setIsChecking] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [statusEmail, setStatusEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tier, setTier] = useState<AdminEntitlementsOverrideTier>('real');
  const isPro = useEntitlementsStore((s) => s.isPro);
  const isProToolsTrial = useEntitlementsStore((s) => s.isProToolsTrial);
  const lastSource = useEntitlementsStore((s) => s.lastSource);
  const refreshEntitlements = useEntitlementsStore((s) => s.refreshEntitlements);

  const [note, setNote] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsChecking(true);
    getAdminProCodesStatus()
      .then((s) => {
        if (!mounted) return;
        setIsSuperAdmin(Boolean(s.role === 'super_admin'));
        setStatusEmail(typeof s.email === 'string' ? s.email : null);
      })
      .catch((e: any) => {
        if (!mounted) return;
        const msg = typeof e?.message === 'string' ? e.message : 'Unable to check admin status';
        setError(msg);
        setIsSuperAdmin(false);
      })
      .finally(() => {
        if (!mounted) return;
        setIsChecking(false);
      });

    getAdminEntitlementsOverrideTier()
      .then((v) => {
        if (!mounted) return;
        setTier(v);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const canUseTools = isSuperAdmin && !isChecking;

  const tierOptions = useMemo(
    () =>
      [
        { value: 'real', label: 'Real' },
        { value: 'free', label: 'Free' },
        { value: 'trial', label: 'Trial' },
        { value: 'pro', label: 'Pro' },
      ] as const,
    [],
  );

  const handleSetTier = async (next: AdminEntitlementsOverrideTier) => {
    setTier(next);
    setError(null);
    try {
      if (next === 'real') {
        await clearAdminEntitlementsOverrideTier();
      } else {
        await setAdminEntitlementsOverrideTier(next);
      }
      await refreshEntitlements({ force: true });
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Unable to update tier';
      setError(msg);
    }
  };

  const handleCreateOneYear = async (send?: { channel: 'email' | 'sms' }) => {
    if (!canUseTools || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const expiresAt = oneYearFromNowIso();
      const { code } = await createProCodeAdmin({
        maxUses: 1,
        expiresAt,
        note: note.trim() ? note.trim() : undefined,
      });
      setLastCode(code);
      await Clipboard.setStringAsync(code);

      if (send?.channel === 'email') {
        await sendProCodeSuperAdmin({
          channel: 'email',
          code,
          recipientEmail: recipientEmail.trim() ? recipientEmail.trim() : undefined,
          note: note.trim() ? note.trim() : undefined,
        });
        Alert.alert('Sent', 'Pro code created and emailed (also copied to clipboard).');
        return;
      }

      if (send?.channel === 'sms') {
        await sendProCodeSuperAdmin({
          channel: 'sms',
          code,
          recipientPhone: recipientPhone.trim() ? recipientPhone.trim() : undefined,
          note: note.trim() ? note.trim() : undefined,
        });
        Alert.alert('Sent', 'Pro code created and texted (also copied to clipboard).');
        return;
      }

      Alert.alert('Created', '1-year Pro code copied to clipboard.');
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Unable to create/send code';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="Super Admin" onPressBack={() => navigation.goBack()} />
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.body}>
              Super Admin tools (production). Requires a signed-in Supabase user allowlisted server-side.
            </Text>
            {statusEmail ? <Text style={styles.body}>Signed in as: {statusEmail}</Text> : null}
            {!isChecking && !isSuperAdmin ? (
              <Text style={styles.warning}>You are not authorized for Super Admin tools.</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <VStack space="sm">
              <Text style={styles.cardTitle}>Simulate plan (device)</Text>
              <Text style={styles.body}>
                Current: {isPro ? 'Pro' : isProToolsTrial ? 'Trial' : 'Free'} • source:{' '}
                {lastSource ?? 'unknown'}
              </Text>
              <SegmentedControl
                value={tier}
                onChange={(next) => handleSetTier(next as AdminEntitlementsOverrideTier)}
                options={tierOptions as any}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </VStack>
          </View>

          <View style={styles.card}>
            <VStack space="sm">
              <Text style={styles.cardTitle}>1-year Pro access code (one-time)</Text>
              <Input
                label="Recipient email (optional)"
                placeholder="someone@example.com"
                value={recipientEmail}
                onChangeText={(t) => {
                  setRecipientEmail(t);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="done"
                variant="outline"
              />
              <Input
                label="Recipient phone (optional)"
                placeholder="+14155551234"
                value={recipientPhone}
                onChangeText={(t) => {
                  setRecipientPhone(t);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="phone-pad"
                returnKeyType="done"
                variant="outline"
              />
              <Input
                label="Note (optional)"
                placeholder="e.g. partner comp"
                value={note}
                onChangeText={(t) => {
                  setNote(t);
                  if (error) setError(null);
                }}
                autoCapitalize="sentences"
                autoCorrect={false}
                keyboardType="default"
                returnKeyType="done"
                variant="outline"
              />

              <HStack space="sm">
                <Button disabled={!canUseTools || isSubmitting} onPress={() => handleCreateOneYear()}>
                  <Text style={styles.buttonLabel}>{isSubmitting ? 'Working…' : 'Generate'}</Text>
                </Button>
                <Button
                  variant="secondary"
                  disabled={!canUseTools || isSubmitting}
                  onPress={() => handleCreateOneYear({ channel: 'email' })}
                >
                  <Text style={styles.secondaryButtonLabel}>Generate + Email</Text>
                </Button>
              </HStack>
              <Button
                variant="secondary"
                disabled={!canUseTools || isSubmitting}
                onPress={() => handleCreateOneYear({ channel: 'sms' })}
              >
                <Text style={styles.secondaryButtonLabel}>Generate + Text</Text>
              </Button>

              {lastCode ? (
                <View style={styles.result}>
                  <Text style={styles.resultLabel}>Last code</Text>
                  <Text style={styles.resultCode}>{lastCode}</Text>
                  <Button
                    variant="secondary"
                    onPress={async () => {
                      await Clipboard.setStringAsync(lastCode);
                      Alert.alert('Copied', 'Code copied to clipboard.');
                    }}
                  >
                    <Text style={styles.secondaryButtonLabel}>Copy again</Text>
                  </Button>
                </View>
              ) : null}
            </VStack>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  body: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  warning: {
    ...typography.bodySm,
    color: colors.warning,
  },
  error: {
    ...typography.bodySm,
    color: colors.accentRoseStrong,
  },
  card: {
    ...(cardSurfaceStyle as any),
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  buttonLabel: {
    ...typography.body,
    color: colors.canvas,
  },
  secondaryButtonLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  result: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  resultLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  resultCode: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
});


