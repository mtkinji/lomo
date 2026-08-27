import { Pressable } from '@/src/ui/HapticPressable';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { File as ExpoFile } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { getSupabaseClient } from '../../services/backend/supabaseClient';
import { useAppStore } from '../../store/useAppStore';
import { colors, spacing, typography } from '../../theme';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { ProfileAvatar } from '../../ui/ProfileAvatar';
import { SettingsGroup, SettingsPage, SettingsRow } from '../../ui/SettingsSurface';
import { Heading, Text, VStack } from '../../ui/primitives';
import { getHouseholdSnapshot, type HouseholdMember } from './data/household';
import {
  listHouseholdDevices,
  revokeHouseholdDevice,
  type HouseholdDevice,
} from './data/householdDeviceParticipation';
import {
  removeAvatar,
  resolveHouseholdAvatars,
  uploadAvatar,
  type HouseholdAvatarMap,
} from './data/householdAvatars';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsHouseholdMember'>;

export function HouseholdMemberDetailScreen({ navigation, route }: Props) {
  const authIdentity = useAppStore((state) => state.authIdentity);
  const client = useMemo(() => (authIdentity ? getSupabaseClient() : null), [authIdentity]);
  const [member, setMember] = useState<HouseholdMember | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [personalDevices, setPersonalDevices] = useState<HouseholdDevice[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      const snapshot = await getHouseholdSnapshot(client);
      const avatars = await resolveHouseholdAvatars().catch((): HouseholdAvatarMap => ({}));
      const selected = snapshot.members.find((item) => item.id === route.params.membershipId) ?? null;
      const current = snapshot.members.find((item) => item.id === snapshot.currentMembershipId) ?? null;
      if (!selected) throw new Error('This person is no longer in your household.');
      setHouseholdId(snapshot.household?.id ?? null);
      setMember({ ...selected, ...(avatars[selected.id] ?? {}) });
      setCanManage(current?.role === 'owner' && selected.role === 'child');
      const devices = snapshot.household && selected.role === 'child'
        ? await listHouseholdDevices(client, snapshot.household.id).catch(() => [])
        : [];
      setPersonalDevices(devices.filter((device) => (
        device.kind === 'personal_child' && device.childMembershipId === selected.id
      )));
    } catch (error) {
      Alert.alert('Unable to load this person', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client, route.params.membershipId]);

  useEffect(() => { void load(); }, [load]);

  const confirmDeviceRemoval = (device: HouseholdDevice) => {
    if (!client || busy || !member) return;
    Alert.alert(
      `Remove ${device.label}?`,
      `Kwilt access for ${member.displayName} will stop on this device. ${member.displayName} will remain in your Household.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove device',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            void revokeHouseholdDevice(client, device.id)
              .then(() => setPersonalDevices((devices) => devices.filter((row) => row.id !== device.id)))
              .catch((error) => Alert.alert(
                'Unable to remove device', error instanceof Error ? error.message : 'Please try again.',
              ))
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  };

  const denied = (type: 'camera' | 'library') => {
    Alert.alert(
      'Permission needed',
      type === 'camera'
        ? 'Allow camera access in Settings to take a photo.'
        : 'Allow photo library access in Settings to choose a photo.',
      [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => void Linking.openSettings() }],
    );
  };

  const pick = async (type: 'camera' | 'library') => {
    if (!member || busy || member.avatarSource === 'account' || !canManage) return;
    const permission = type === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { denied(type); return; }
    try {
      const result = type === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
      if (result.canceled || !result.assets[0]?.uri) return;
      const asset = result.assets[0];
      const file = new ExpoFile(asset.uri);
      const mimeType = asset.mimeType ?? file.type ?? 'image/jpeg';
      const sizeBytes = asset.fileSize ?? file.size;
      setBusy(true);
      const resolved = await uploadAvatar({
        source: 'dependent', membershipId: member.id, fileUri: asset.uri, mimeType, sizeBytes,
      });
      setMember((current) => current ? { ...current, ...resolved } : current);
      setPickerVisible(false);
    } catch (error) {
      Alert.alert('Unable to update photo', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!member || busy || member.avatarSource !== 'dependent' || !canManage) return;
    setBusy(true);
    try {
      const resolved = await removeAvatar({ source: 'dependent', membershipId: member.id });
      setMember((current) => current ? { ...current, ...resolved } : current);
      setPickerVisible(false);
    } catch (error) {
      Alert.alert('Unable to remove photo', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const connected = member?.avatarSource === 'account';
  const editable = Boolean(member && canManage && !connected);

  return (
    <SettingsPage onBack={() => navigation.goBack()} title={member?.displayName ?? 'Family member'}>
      <View style={styles.identity}>
        <Pressable
          accessibilityRole={editable ? 'button' : undefined}
          accessibilityLabel={editable ? `Update ${member?.displayName ?? 'child'} photo` : undefined}
          accessibilityState={{ busy }}
          disabled={!editable || busy}
          onPress={() => setPickerVisible(true)}
          style={styles.avatarButton}
        >
          <ProfileAvatar name={member?.displayName ?? ''} avatarUrl={member?.avatarUrl} size={112} />
          {editable ? <View style={styles.badge}><Icon color={colors.canvas} name="camera" size={17} /></View> : null}
        </Pressable>
        <Heading style={styles.name}>{loading ? 'Loading…' : member?.displayName}</Heading>
        {connected && member ? (
          <Text style={styles.source}>{`Photo comes from ${member.displayName}'s Kwilt account.`}</Text>
        ) : null}
      </View>

      {member ? (
        <SettingsGroup title="Household">
          <SettingsRow title="Role" value={member.role === 'child' ? 'Child' : member.role === 'owner' ? 'Organizer' : 'Caregiver'} />
        </SettingsGroup>
      ) : null}

      {member?.role === 'child' ? (
        <SettingsGroup
          footer={personalDevices.length > 0
            ? 'Personal devices are used mainly by this child. Shared household devices are managed separately.'
            : undefined}
          title="Devices"
        >
          {personalDevices.length > 0 ? personalDevices.map((device) => (
            <SettingsRow
              key={device.id}
              disabled={busy || !canManage}
              onPress={canManage ? () => confirmDeviceRemoval(device) : undefined}
              title={device.label}
              value={device.status === 'ready' ? 'Connected' : 'Needs attention'}
            />
          )) : (
            <View style={styles.deviceEmptyState}>
              <View accessibilityElementsHidden accessibilityRole="none" style={styles.deviceIcon}>
                <Icon color={colors.textSecondary} name="smartphone" size={22} />
              </View>
              <Text style={styles.deviceTitle}>No device connected</Text>
              {canManage && householdId ? (
                <View style={styles.deviceAction}>
                  <Button
                    fullWidth
                    onPress={() => navigation.navigate('SettingsHouseholdDeviceSetup', {
                      childMembershipId: member.id,
                      childDisplayName: member.displayName,
                      householdId,
                    })}
                    variant="secondary"
                  >
                    {`Connect ${member.displayName}'s device`}
                  </Button>
                </View>
              ) : null}
            </View>
          )}
        </SettingsGroup>
      ) : null}

      <BottomDrawer visible={pickerVisible} onClose={() => { if (!busy) setPickerVisible(false); }} snapPoints={['48%', '70%']}>
        <View style={styles.sheet}>
          <Heading>{member?.avatarSource === 'dependent' ? 'Update photo' : 'Add photo'}</Heading>
          <VStack space="sm">
            <Button disabled={busy} fullWidth onPress={() => void pick('camera')} variant="secondary">Take photo</Button>
            <Button disabled={busy} fullWidth onPress={() => void pick('library')} variant="secondary">Choose from library</Button>
            {member?.avatarSource === 'dependent' ? (
              <Button disabled={busy} fullWidth onPress={() => void remove()} variant="ghost">Remove photo</Button>
            ) : null}
          </VStack>
        </View>
      </BottomDrawer>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg },
  avatarButton: { minWidth: 112, minHeight: 112, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.textPrimary, borderWidth: 3, borderColor: colors.canvas },
  name: { textAlign: 'center' },
  source: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center' },
  sheet: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  deviceEmptyState: { alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  deviceIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.shellAlt },
  deviceTitle: { ...typography.body, color: colors.textPrimary, textAlign: 'center' },
  deviceAction: { alignSelf: 'stretch' },
});
