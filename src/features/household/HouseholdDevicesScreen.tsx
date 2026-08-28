import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { getSupabaseClient } from '../../services/backend/supabaseClient';
import { getInstallId } from '../../services/installId';
import { useAppStore } from '../../store/useAppStore';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { SettingsGroup, SettingsPage, SettingsRow, SettingsToggleRow } from '../../ui/SettingsSurface';
import { Heading, Text } from '../../ui/primitives';
import type { ChildCapabilityActivation, HouseholdMember } from './data/household';
import {
  designateSharedHouseholdDevice,
  type HouseholdDevice,
} from './data/householdDeviceParticipation';
import { createHouseholdActionBoundary } from './data/householdActionBoundary';
import { revokeHouseholdDeviceReviewed, updateHouseholdDevice } from './data/householdManagementActions';
import { useHouseholdModeStore } from './sharedDevice/useHouseholdModeStore';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsHouseholdDevices'>;

export function HouseholdDevicesScreen({ navigation, route }: Props) {
  const authIdentity = useAppStore((state) => state.authIdentity);
  const client = useMemo(() => (authIdentity ? getSupabaseClient() : null), [authIdentity]);
  const householdActions = useMemo(() => (client ? createHouseholdActionBoundary(client) : null), [client]);
  const [children, setChildren] = useState<HouseholdMember[]>([]);
  const [devices, setDevices] = useState<HouseholdDevice[]>([]);
  const [installId, setInstallId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activations, setActivations] = useState<ChildCapabilityActivation[]>([]);
  const enterHouseholdMode = useHouseholdModeStore((state) => state.enter);

  const load = useCallback(async () => {
    if (!householdActions) return;
    try {
      const [snapshot, id, rows] = await Promise.all([
        householdActions.read(),
        getInstallId(),
        householdActions.listDevices(route.params.householdId),
      ]);
      setChildren(snapshot.members.filter((member) => member.role === 'child'));
      setActivations(snapshot.activations);
      setInstallId(id);
      setDevices(rows);
    } catch (error) {
      Alert.alert('Unable to load Household devices', error instanceof Error ? error.message : 'Please try again.');
    }
  }, [householdActions, route.params.householdId]);

  useEffect(() => { void load(); }, [load]);

  const current = devices.find((device) => (
    device.kind === 'shared_household' && device.installId === installId && device.status !== 'revoked'
  )) ?? null;

  const designate = async () => {
    if (!client || !installId || busy) return;
    setBusy(true);
    try {
      await designateSharedHouseholdDevice(client, {
        householdId: route.params.householdId,
        installId,
        label: 'Shared iPad',
        platform: 'ipados',
      });
      await load();
    } catch (error) {
      Alert.alert('Unable to set up this iPad', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const toggleMember = async (membershipId: string) => {
    if (!householdActions || !current || busy) return;
    const next = current.memberIds.includes(membershipId)
      ? current.memberIds.filter((id) => id !== membershipId)
      : [...current.memberIds, membershipId];
    setBusy(true);
    try {
      const receipt = await updateHouseholdDevice({
        householdId: route.params.householdId, deviceId: current.id,
        expectedUpdatedAt: current.updatedAt, fields: { memberIds: next }, confirmed: true,
      }, householdActions);
      setDevices((rows) => rows.map((device) => device.id === current.id ? receipt.result : device));
    } catch (error) {
      Alert.alert('Unable to update this iPad', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const release = async () => {
    if (!householdActions || !current || busy) return;
    setBusy(true);
    try {
      const receipt = await revokeHouseholdDeviceReviewed({
        householdId: route.params.householdId, deviceId: current.id,
        expectedUpdatedAt: current.updatedAt, confirmed: true,
      }, householdActions);
      setDevices((rows) => rows.map((device) => device.id === current.id ? receipt.result : device));
    } catch (error) {
      Alert.alert('Unable to remove this iPad', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmRelease = () => {
    if (!current || busy) return;
    Alert.alert(
      'Remove this iPad?',
      'Household Mode will stop on this iPad. No one will be removed from your Household.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove iPad', style: 'destructive', onPress: () => void release() },
      ],
    );
  };

  return (
    <SettingsPage onBack={() => navigation.goBack()} title="Household devices">
      {!current ? (
        <View style={styles.hero}>
          <Heading>Set up this iPad for your household</Heading>
          <Text style={styles.body}>
            Sign in once, choose who can use it, and let each child enter only their approved Household features. No QR code or per-child pairing is needed.
          </Text>
          <Button disabled={busy || !installId} fullWidth onPress={() => void designate()}>
            Set up this iPad
          </Button>
        </View>
      ) : (
        <>
          <SettingsGroup footer="This iPad belongs to the Household, not to any one child." title="This iPad">
            <SettingsRow title={current.label} value="Household Mode ready" />
          </SettingsGroup>
          <SettingsGroup footer="Choosing a child here does not activate every capability." title="Who can use this iPad?">
            {children.map((child) => (
              <SettingsToggleRow
                key={child.id}
                disabled={busy}
                enabled={current.memberIds.includes(child.id)}
                onPress={() => void toggleMember(child.id)}
                title={child.displayName}
              />
            ))}
          </SettingsGroup>
          {current.memberIds.length > 0 ? (
            <View style={styles.actions}>
              <Button
                fullWidth
                onPress={() => enterHouseholdMode({
                  deviceId: current.id,
                  householdId: route.params.householdId,
                  assignedCaregiverUserId: authIdentity!.userId,
                  assignedCaregiverName: authIdentity?.name?.trim() || 'Caregiver',
                  members: children.filter((child) => current.memberIds.includes(child.id)).map((child) => ({
                    id: child.id,
                    displayName: child.displayName,
                    capabilityIds: activations.filter((activation) => (
                      activation.childMembershipId === child.id && activation.state === 'active'
                    )).map((activation) => activation.capabilityId),
                  })),
                })}
              >
                Open Household Mode
              </Button>
            </View>
          ) : null}
          <SettingsGroup footer="Removing Household Mode does not remove anyone from your Household." title="Manage">
            <SettingsRow destructive disabled={busy} onPress={confirmRelease} title="Remove this iPad" />
          </SettingsGroup>
        </>
      )}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.lg, padding: spacing.lg },
  body: { ...typography.body, color: colors.textSecondary },
  actions: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
