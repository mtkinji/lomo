import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, spacing, typography } from '../../../theme';
import { Button } from '../../../ui/Button';
import { ProfileAvatar } from '../../../ui/ProfileAvatar';
import { AppShell } from '../../../ui/layout/AppShell';
import { Heading, Text } from '../../../ui/primitives';
import {
  claimManagedChildSetup,
  previewManagedChildSetup,
  type ManagedChildSetupPreview,
} from './managedChildAccess';
import { useManagedChildAccessStore } from './useManagedChildAccessStore';
import { requestScreenTimeAuthorization } from '../../../services/appleEcosystem/screenTimeProtection';
import {
  formatHouseholdDeviceManualCode,
  normalizeHouseholdDeviceManualCode,
} from '../data/householdDeviceParticipation';

const labels: Record<string, string> = {
  chores: 'Chores',
  todos: 'Chores & To-dos',
  'meal-planning': 'Meals & Groceries',
  'screen-time': 'Screen Time',
};

export function ManagedChildDeviceHost() {
  const access = useManagedChildAccessStore((state) => state.access);
  const pending = useManagedChildAccessStore((state) => state.pendingSetup);
  const manualEntryOpen = useManagedChildAccessStore((state) => state.manualEntryOpen);
  const submitManualCode = useManagedChildAccessStore((state) => state.submitManualCode);
  const cancel = useManagedChildAccessStore((state) => state.cancelSetup);
  const setAccess = useManagedChildAccessStore((state) => state.setAccess);
  const [manualCode, setManualCode] = useState('');
  const [preview, setPreview] = useState<ManagedChildSetupPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleAuthorization, setAppleAuthorization] = useState<'idle' | 'approved' | 'denied' | 'unavailable'>('idle');

  useEffect(() => {
    if (!pending) { setPreview(null); return; }
    let cancelled = false;
    setBusy(true);
    setError(null);
    previewManagedChildSetup(pending).then((value) => {
      if (!cancelled) setPreview(value);
    }).catch((reason) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'This setup code is invalid or expired');
    }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [pending]);

  if (access) {
    return (
      <AppShell backgroundVariant="shellAlt">
        <View style={styles.page}>
          <View style={styles.identity}>
            <ProfileAvatar name={access.childDisplayName} size={88} />
            <Heading>{`Kwilt for ${access.childDisplayName}`}</Heading>
            <Text style={styles.body}>{access.householdName}</Text>
          </View>
          <View style={styles.capabilities}>
            {access.verification === 'unavailable' ? (
              <View style={styles.card}>
                <Heading>Connection unavailable</Heading>
                <Text style={styles.body}>Kwilt can’t verify this device right now. Reopen Kwilt when this iPhone is online.</Text>
              </View>
            ) : access.capabilityIds.flatMap((id) => labels[id] ? [
              <View key={id} style={styles.card}>
                <Heading>{labels[id]}</Heading>
                <Text style={styles.body}>{id === 'screen-time'
                  ? appleAuthorization === 'approved'
                    ? 'Apple approval was received. Kwilt will show Ready only after this iPhone applies and receipts the agreement.'
                    : 'A parent or guardian must approve Apple parental controls on this iPhone.'
                  : `Set up for ${access.childDisplayName}.`}</Text>
                {id === 'screen-time' && appleAuthorization !== 'approved' ? (
                  <Button
                    fullWidth
                    onPress={() => void requestScreenTimeAuthorization('child').then((status) => {
                      setAppleAuthorization(status === 'approved' ? 'approved'
                        : status === 'denied' || status === 'revoked' ? 'denied' : 'unavailable');
                    })}
                    variant="secondary"
                  >
                    Continue to Apple
                  </Button>
                ) : null}
              </View>,
            ] : [])}
            {access.verification === 'current' && access.capabilityIds.length === 0 ? (
              <Text style={styles.body}>You’re connected. A caregiver can choose which Household features appear here.</Text>
            ) : null}
          </View>
        </View>
      </AppShell>
    );
  }

  if (manualEntryOpen) {
    return (
      <AppShell backgroundVariant="shellAlt">
        <View style={styles.center}>
          <Heading>Enter the setup code</Heading>
          <Text style={styles.body}>Use the 6-digit code shown on the caregiver’s device.</Text>
          <TextInput
            accessibilityLabel="Device setup code"
            autoCorrect={false}
            keyboardType="number-pad"
            maxLength={7}
            onChangeText={(value) => setManualCode(formatHouseholdDeviceManualCode(value))}
            placeholder="482-731"
            style={styles.input}
            value={manualCode}
          />
          <Button
            disabled={normalizeHouseholdDeviceManualCode(manualCode).length !== 6}
            fullWidth
            onPress={() => submitManualCode(normalizeHouseholdDeviceManualCode(manualCode))}
          >
            Continue
          </Button>
          <Button fullWidth onPress={cancel} variant="ghost">Not now</Button>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell backgroundVariant="shellAlt">
      <View style={styles.center}>
        <Heading>{preview ? `Set up Kwilt for ${preview.childDisplayName}` : 'Checking this setup…'}</Heading>
        {preview ? (
          <>
            <Text style={styles.body}>
              {`${preview.caregiverDisplayName} approved this device for ${preview.childDisplayName} in ${preview.householdName}. ${preview.childDisplayName} will only see the Household features set up for them.`}
            </Text>
            <Button
              disabled={busy || !pending}
              fullWidth
              onPress={() => {
                if (!pending) return;
                setBusy(true);
                setError(null);
                void claimManagedChildSetup({ ...pending, preview })
                  .then(setAccess)
                  .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to set up this device'))
                  .finally(() => setBusy(false));
              }}
            >
              Set up this iPhone
            </Button>
          </>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button fullWidth onPress={cancel} variant="ghost">Not now</Button>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: spacing.xl, gap: spacing.xl },
  center: { flex: 1, justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  identity: { alignItems: 'center', gap: spacing.md },
  body: { ...typography.body, color: colors.textSecondary },
  error: { ...typography.body, color: colors.destructive },
  input: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.canvas, borderRadius: 14, padding: spacing.md },
  capabilities: { gap: spacing.md },
  card: { gap: spacing.sm, padding: spacing.lg, borderRadius: 20, backgroundColor: colors.canvas },
});
