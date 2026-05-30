import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, cardSurfaceStyle } from '../../theme';
import { resetUserSpecificState, useAppStore } from '../../store/useAppStore';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { HStack, Input, KeyboardAwareScrollView, Text, VStack } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { deleteAccount } from '../../services/accountDeletion';
import { clearAdminEntitlementsOverrideTier, openManageSubscription } from '../../services/entitlements';
import { unregisterPushToken } from '../../services/pushTokenService';

type SettingsNavigationProp = NativeStackNavigationProp<
  SettingsStackParamList,
  'SettingsProfile'
>;

export function ProfileSettingsScreen() {
  const navigation = useNavigation<SettingsNavigationProp>();
  const authIdentity = useAppStore((state) => state.authIdentity);
  const userProfile = useAppStore((state) => state.userProfile);
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);

  const [fullName, setFullName] = useState(userProfile?.fullName ?? '');
  const [email, setEmail] = useState(userProfile?.email ?? '');
  const [birthdate, setBirthdate] = useState(userProfile?.birthdate ?? '');
  const [isBirthdatePickerVisible, setIsBirthdatePickerVisible] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const parseLocalDateKey = (key: string): Date | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
    if (!match) return null;
    const y = Number.parseInt(match[1] ?? '', 10);
    const m = Number.parseInt(match[2] ?? '', 10);
    const d = Number.parseInt(match[3] ?? '', 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    return new Date(y, m - 1, d);
  };

  const formatBirthdateForDisplay = (key: string): string => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
    if (!match) return key;
    const y = match[1];
    const m = match[2];
    const d = match[3];
    return `${m}-${d}-${y}`;
  };

  const commitProfile = (override?: { birthdate?: string }) => {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedBirthdate = (override?.birthdate ?? birthdate).trim();
    const nextName = trimmedName || undefined;
    const nextEmail = trimmedEmail || undefined;
    const nextBirthdate = trimmedBirthdate || undefined;

    if (
      nextName === (userProfile?.fullName ?? undefined) &&
      nextEmail === (userProfile?.email ?? undefined) &&
      nextBirthdate === (userProfile?.birthdate ?? undefined)
    ) {
      return;
    }

    updateUserProfile((current) => ({
      ...current,
      fullName: nextName,
      email: nextEmail,
      birthdate: nextBirthdate,
    }));
  };

  useEffect(() => {
    setFullName(userProfile?.fullName ?? '');
    setEmail(userProfile?.email ?? '');
    setBirthdate(userProfile?.birthdate ?? '');
  }, [userProfile?.fullName, userProfile?.email, userProfile?.birthdate]);

  const getInitialBirthdateForPicker = () => {
    if (birthdate) {
      const parsed = parseLocalDateKey(birthdate);
      if (parsed) return parsed;
    }
    // Reasonable default if none is set: 25 years ago from today.
    const today = new Date();
    return new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
  };

  const handleBirthdateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') {
      setIsBirthdatePickerVisible(false);
    }

    if (!date || event.type === 'dismissed') {
      return;
    }

    // Use local calendar date instead of UTC to avoid off-by-one issues when
    // converting to ISO strings.
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;

    setBirthdate(formatted);
    commitProfile({ birthdate: formatted });
  };

  const completeAccountDeletion = async () => {
    if (isDeletingAccount) return;
    try {
      setIsDeletingAccount(true);
      await unregisterPushToken().catch(() => undefined);
      await deleteAccount();
      await clearAdminEntitlementsOverrideTier().catch(() => undefined);
      resetUserSpecificState();
      useAppStore.getState().clearAuthIdentity();
      Alert.alert('Account deleted', 'Your Kwilt account has been deleted.');
    } catch (err: any) {
      Alert.alert(
        'Unable to delete account',
        typeof err?.message === 'string' ? err.message : 'Please try again.',
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleManageSubscriptionFromDeletion = () => {
    openManageSubscription().catch(() => {
      Alert.alert(
        'Unable to open',
        'Please open Apple subscription settings to manage your plan.',
      );
    });
  };

  const confirmAccountDeletion = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your Kwilt account and cloud data. This cannot be undone. If you have an Apple subscription, deleting your account does not cancel billing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Manage subscription',
          onPress: handleManageSubscriptionFromDeletion,
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete permanently?',
              'Your account, synced to-dos, goals, chapters, attachments, and connected services will be removed. Any Apple subscription remains managed by Apple until canceled.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete account',
                  style: 'destructive',
                  onPress: () => {
                    completeAccountDeletion().catch(() => undefined);
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader
          title="Account settings"
          onPressBack={() => navigation.goBack()}
        />
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Input
              label="Full name"
              placeholder="Add your name"
              value={fullName}
              onChangeText={setFullName}
              onBlur={() => commitProfile()}
              autoCapitalize="words"
              variant="outline"
            />
            <Input
              label="Birthday"
              placeholder="MM-DD-YYYY"
              value={birthdate ? formatBirthdateForDisplay(birthdate) : ''}
              onChangeText={() => {}}
              onFocus={() => setIsBirthdatePickerVisible(true)}
              showSoftInputOnFocus={false}
              variant="outline"
            />
            <Input
              label="Email"
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              onBlur={() => commitProfile()}
              variant="outline"
            />
          </View>
          {isBirthdatePickerVisible && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                value={getInitialBirthdateForPicker()}
                onChange={handleBirthdateChange}
                maximumDate={new Date()}
              />
            </View>
          )}
          {authIdentity ? (
            <View style={styles.dangerCard}>
              <VStack space="xs">
                <Text style={styles.dangerKicker}>Account deletion</Text>
                <Text style={styles.dangerBody}>
                  Permanently delete your Kwilt account and synced cloud data. Apple subscriptions are managed separately.
                </Text>
              </VStack>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete account"
                accessibilityState={{ disabled: isDeletingAccount, busy: isDeletingAccount }}
                disabled={isDeletingAccount}
                onPress={confirmAccountDeletion}
                style={({ pressed }) => [
                  styles.deleteRow,
                  pressed && !isDeletingAccount ? styles.deleteRowPressed : null,
                  isDeletingAccount ? styles.deleteRowDisabled : null,
                ]}
              >
                <HStack alignItems="center" space="sm">
                  <Icon name="trash" size={18} color={isDeletingAccount ? colors.textSecondary : colors.destructive} />
                  <Text style={[styles.deleteRowLabel, isDeletingAccount ? styles.deleteRowLabelDisabled : null]}>
                    {isDeletingAccount ? 'Deleting account...' : 'Delete account'}
                  </Text>
                </HStack>
              </Pressable>
            </View>
          ) : null}
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
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  card: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
    gap: spacing.md,
  },
  datePickerContainer: {
    marginTop: spacing.md,
  },
  dangerCard: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
    gap: spacing.md,
  },
  dangerKicker: {
    color: colors.destructive,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dangerBody: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
  deleteRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.destructive,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.destructiveForeground,
  },
  deleteRowPressed: {
    opacity: 0.82,
  },
  deleteRowDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.cardMuted,
  },
  deleteRowLabel: {
    color: colors.destructive,
    fontSize: 17,
    fontWeight: '700',
  },
  deleteRowLabelDisabled: {
    color: colors.textSecondary,
  },
});

