import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Icon, type IconName } from '../../ui/Icon';
import { HStack, Text, VStack } from '../../ui/primitives';
import { colors, fonts, spacing, typography } from '../../theme';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { openManageSubscription } from '../../services/entitlements';
import { KWILT_PRIVACY_URL, KWILT_TERMS_URL } from '../paywall/SubscriptionLegalLinks';

const SUPPORT_EMAIL = 'support@kwilt.app';

type LegalPrivacyNavigationProp = NativeStackNavigationProp<
  SettingsStackParamList,
  'SettingsLegalPrivacy'
>;

type LegalRow = {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  onPress: () => void;
};

function openUrl(url: string) {
  Linking.openURL(url).catch(() => {
    Alert.alert('Unable to open link', 'Please try again in a moment.');
  });
}

function LegalPrivacyRow({ row }: { row: LegalRow }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.title}
      onPress={row.onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <View style={styles.rowIcon}>
        <Icon name={row.icon} size={18} color={colors.textPrimary} />
      </View>
      <VStack flex={1} space={2}>
        <Text style={styles.rowTitle}>{row.title}</Text>
        <Text style={styles.rowDescription}>{row.description}</Text>
      </VStack>
      <Icon name="chevronRight" size={18} color={colors.muted} />
    </Pressable>
  );
}

export function LegalPrivacyScreen() {
  const navigation = useNavigation<LegalPrivacyNavigationProp>();

  const rows = React.useMemo<LegalRow[]>(
    () => [
      {
        id: 'privacy',
        title: 'Privacy Policy',
        description: 'How Kwilt handles app data, AI, subscriptions, Health, location, and SMS.',
        icon: 'shield',
        onPress: () => openUrl(KWILT_PRIVACY_URL),
      },
      {
        id: 'terms',
        title: 'Terms of Use (EULA)',
        description: 'Subscription terms, account responsibilities, AI limits, and app use.',
        icon: 'fileText',
        onPress: () => openUrl(KWILT_TERMS_URL),
      },
      {
        id: 'support',
        title: 'Contact support',
        description: SUPPORT_EMAIL,
        icon: 'mail',
        onPress: () => openUrl(`mailto:${SUPPORT_EMAIL}`),
      },
      {
        id: 'subscriptions',
        title: 'Manage subscription',
        description: 'Open Apple subscription management for billing changes or cancellation.',
        icon: 'cart',
        onPress: () => {
          openManageSubscription().catch(() => {
            Alert.alert(
              'Unable to open',
              'Please open Apple subscription settings to manage your plan.',
            );
          });
        },
      },
      {
        id: 'account',
        title: 'Account deletion',
        description: 'Delete a signed-in Kwilt account and synced cloud data from Account settings.',
        icon: 'trash',
        onPress: () => navigation.navigate('SettingsProfile'),
      },
    ],
    [navigation],
  );

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="Legal & privacy" onPressBack={() => navigation.goBack()} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Your controls</Text>
            <Text style={styles.summaryBody}>
              Kwilt is local-first, with cloud services used for sign-in, sharing, AI,
              subscriptions, attachments, and connected tools you choose to use.
            </Text>
          </View>

          <View style={styles.rowsCard}>
            {rows.map((row, index) => (
              <React.Fragment key={row.id}>
                <LegalPrivacyRow row={row} />
                {index < rows.length - 1 ? <View style={styles.divider} /> : null}
              </React.Fragment>
            ))}
          </View>

          <View style={styles.noteCard}>
            <HStack space="sm" alignItems="flex-start">
              <Icon name="info" size={18} color={colors.textSecondary} />
              <Text style={styles.noteText}>
                Deleting your Kwilt account does not cancel Apple-managed subscriptions. Use
                Manage subscription before or after deletion to change billing.
              </Text>
            </HStack>
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  summaryTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  summaryBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  rowsCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.shell,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.shell,
  },
  rowTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  rowDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md + 34 + spacing.md,
    backgroundColor: colors.border,
  },
  noteCard: {
    borderRadius: 14,
    backgroundColor: colors.shell,
    padding: spacing.md,
  },
  noteText: {
    ...typography.bodySm,
    flex: 1,
    color: colors.textSecondary,
  },
});
