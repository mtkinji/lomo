import { Pressable } from '@/src/ui/HapticPressable';
import React from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon, type IconName } from '../../ui/Icon';
import { HStack, Text, VStack } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { openManageSubscription } from '../../services/entitlements';
import { KWILT_PRIVACY_URL, KWILT_TERMS_URL } from '../paywall/SubscriptionLegalLinks';
import { SettingsDivider, SettingsGroup, SettingsPage, SettingsToggleRow } from '../../ui/SettingsSurface';
import { resolveAnalyticsConsent, useAnalyticsConsentStore } from '../../services/analytics/analyticsConsent';

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
  const consentStatus = useAnalyticsConsentStore((state) => state.status);
  const consentPolicyVersion = useAnalyticsConsentStore((state) => state.policyVersion);
  const setAnalyticsEnabled = useAnalyticsConsentStore((state) => state.setEnabled);
  const analyticsConsent = resolveAnalyticsConsent({
    status: consentStatus,
    policyVersion: consentPolicyVersion,
  });

  const rows = React.useMemo<LegalRow[]>(
    () => [
      {
        id: 'privacy',
        title: 'Privacy Policy',
        description: 'Money, Explore, meals and groceries, Games, planning, Chat, and account data.',
        icon: 'shield',
        onPress: () => openUrl(KWILT_PRIVACY_URL),
      },
      {
        id: 'terms',
        title: 'Terms of Use (EULA)',
        description: 'Accounts, subscriptions, sharing, connected services, and capability limits.',
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
    <SettingsPage title="Legal & privacy" onBack={() => navigation.goBack()}>
      <SettingsGroup
        title="Optional analytics"
        footer="This choice does not change any Kwilt feature. Essential account security, service delivery, and crash diagnostics are handled separately under the Privacy Policy."
      >
        <SettingsToggleRow
          title="Share product analytics"
          description="Help improve Kwilt by sharing bounded app-usage events. Kwilt does not include your writing, financial details, precise location, messages, recipes, or household content."
          enabled={analyticsConsent.enabled}
          value={analyticsConsent.enabled ? 'On' : 'Off'}
          onPress={() => setAnalyticsEnabled(!analyticsConsent.enabled)}
        />
      </SettingsGroup>

      <SettingsGroup
        footer="Covers AI and voice, calendar, Health, family sharing, and subscriptions. Kwilt is local-first, not device-only."
      >
        {rows.map((row, index) => (
          <React.Fragment key={row.id}>
            <LegalPrivacyRow row={row} />
            {index < rows.length - 1 ? <SettingsDivider /> : null}
          </React.Fragment>
        ))}
      </SettingsGroup>

      <SettingsGroup>
        <View style={styles.noteRow}>
          <HStack space="sm" alignItems="flex-start">
            <Icon name="info" size={17} color={colors.textSecondary} />
            <Text style={styles.noteText}>
              Deleting your Kwilt account does not cancel Apple-managed subscriptions. Use Manage subscription before or
              after deletion to change billing.
            </Text>
          </HStack>
        </View>
      </SettingsGroup>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowPressed: {
    opacity: 0.72,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.shellAlt,
  },
  rowTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  rowDescription: {
    ...typography.bodyXs,
    color: colors.textSecondary,
  },
  noteRow: {
    padding: spacing.md,
  },
  noteText: {
    ...typography.bodyXs,
    flex: 1,
    color: colors.textSecondary,
  },
});
