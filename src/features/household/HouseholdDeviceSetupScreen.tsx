import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Image, Share, StyleSheet, View } from 'react-native';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { getSupabaseClient } from '../../services/backend/supabaseClient';
import { useAppStore } from '../../store/useAppStore';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { KwiltLoader } from '../../ui/KwiltLoader';
import { SettingsGroup, SettingsPage, SettingsRow } from '../../ui/SettingsSurface';
import { Heading, Text } from '../../ui/primitives';
import {
  buildHouseholdDeviceSetupUrl,
  cancelHouseholdDeviceSetupSession,
  createHouseholdDeviceSetupSession,
  formatHouseholdDeviceManualCode,
  listHouseholdDevices,
  type HouseholdDeviceSetupSession,
} from './data/householdDeviceParticipation';
import {
  openFamilyScreenTimeProPaywall,
  requestFamilyScreenTimeProAccess,
} from './screenTime/familyScreenTimeProAccess';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsHouseholdDeviceSetup'>;

const CONNECTED_DEVICE_ILLUSTRATION = require('../../../assets/illustrations/household-device-connected.png');

export function HouseholdDeviceSetupScreen({ navigation, route }: Props) {
  const authIdentity = useAppStore((state) => state.authIdentity);
  const client = useMemo(() => (authIdentity ? getSupabaseClient() : null), [authIdentity]);
  const [session, setSession] = useState<HouseholdDeviceSetupSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const hasStarted = useRef(false);
  const { childDisplayName, childMembershipId, householdId } = route.params;

  useEffect(() => {
    if (!client || !session || connected) return;
    let active = true;
    let checking = false;
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const devices = await listHouseholdDevices(client, householdId);
        if (active && devices.some((device) => device.kind === 'personal_child'
          && device.childMembershipId === childMembershipId)) setConnected(true);
      } catch {
        // A transient receipt check must not replace a still-valid pairing code.
      } finally {
        checking = false;
      }
    };
    void check();
    const timer = setInterval(() => void check(), 3_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [childMembershipId, client, connected, householdId, session]);

  useEffect(() => {
    if (connected) AccessibilityInfo.announceForAccessibility(`${childDisplayName}'s device is connected`);
  }, [childDisplayName, connected]);

  const start = useCallback(async () => {
    if (!client || busy) return;
    if (!requestFamilyScreenTimeProAccess()) {
      navigation.goBack();
      return;
    }
    setStartError(null);
    setBusy(true);
    try {
      setSession(await createHouseholdDeviceSetupSession(client, childMembershipId));
    } catch (error) {
      if (error instanceof Error && error.message.includes('kwilt_pro_required')) {
        openFamilyScreenTimeProPaywall();
        navigation.goBack();
        return;
      }
      setStartError(error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, childMembershipId, client, navigation]);

  useEffect(() => {
    if (!client || hasStarted.current) return;
    hasStarted.current = true;
    void start();
  }, [client, start]);

  const cancel = async () => {
    if (!client || !session) {
      navigation.goBack();
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await cancelHouseholdDeviceSetupSession(client, session.id);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Unable to cancel setup', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (connected) {
    return (
      <SettingsPage
        contentStyle={styles.connectedPageContent}
        onBack={() => navigation.goBack()}
        title={`${childDisplayName}'s device`}
      >
        <View style={styles.connectedLayout}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.connectedIllustrationSlot}
            testID="household-device-connected-illustration"
          >
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={CONNECTED_DEVICE_ILLUSTRATION}
              style={styles.connectedIllustration}
            />
          </View>
          <Heading>{`${childDisplayName}'s device is connected`}</Heading>
          <Text style={styles.body}>Kwilt is ready for the Household features you choose for {childDisplayName}.</Text>
          <Button fullWidth onPress={() => navigation.goBack()}>Done</Button>
        </View>
      </SettingsPage>
    );
  }

  if (!session) {
    return (
      <SettingsPage onBack={() => navigation.goBack()} title={`Connect ${childDisplayName}'s device`}>
        <View style={styles.hero}>
          <Heading>{startError ? 'Unable to create a pairing code' : 'Creating a secure pairing code…'}</Heading>
          <Text style={styles.body}>
            {startError
              ? startError
              : `${childDisplayName} does not need a separate Kwilt account.`}
          </Text>
          {startError ? (
            <Button disabled={busy} fullWidth onPress={() => void start()}>Try again</Button>
          ) : (
            <KwiltLoader color={colors.textPrimary} size="large" />
          )}
        </View>
      </SettingsPage>
    );
  }

  const setupUrl = buildHouseholdDeviceSetupUrl(session.token);
  return (
    <SettingsPage
      headerAction={(
        <Button
          accessibilityLabel={`Share setup link for ${childDisplayName}`}
          haptic="shell.nav.selection"
          iconButtonSize={44}
          onPress={() => void Share.share({ message: setupUrl })}
          size="icon"
          variant="ghost"
        >
          <Icon name="share" size={21} color={colors.textPrimary} />
        </Button>
      )}
      onBack={() => void cancel()}
      title={`Connect ${childDisplayName}'s device`}
    >
      <View style={styles.receiptLayout}>
        <View style={styles.receiptIntro}>
          <Heading>{`Scan this with ${childDisplayName}'s device`}</Heading>
          <Text style={styles.body}>{`Open Kwilt on ${childDisplayName}'s device and scan this code.`}</Text>
          <View style={styles.qrCard} testID="household-device-qr-card">
            <QRCode backgroundColor={colors.canvas} color={colors.textPrimary} size={190} value={setupUrl} />
          </View>
        </View>
        <SettingsGroup footer={`This code expires ${new Date(session.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`} title="Manual code">
          <SettingsRow title={formatHouseholdDeviceManualCode(session.manualCode)} />
        </SettingsGroup>
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.lg, padding: spacing.lg },
  receiptLayout: { gap: spacing.xl, paddingHorizontal: spacing.lg },
  receiptIntro: { gap: spacing.lg },
  connectedPageContent: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  connectedLayout: { gap: spacing.lg },
  connectedIllustrationSlot: { height: 280, alignItems: 'center', justifyContent: 'center' },
  connectedIllustration: { width: '100%', height: 240 },
  body: { ...typography.body, color: colors.textSecondary },
  qrCard: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.canvas },
});
