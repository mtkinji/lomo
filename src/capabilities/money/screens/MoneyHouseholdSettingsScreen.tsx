import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { SettingsDivider, SettingsGroup, SettingsPage, SettingsRow } from '../../../ui/SettingsSurface';
import {
  acceptMoneyFamilyInvite,
  getMoneyFamilyStatus,
  type MoneyFamilyStatus,
} from '../data/moneyFamilySharing';
import type { SettingsStackParamList } from '../../../navigation/RootNavigator';

export function MoneyHouseholdSettingsScreen({ navigation }: NativeStackScreenProps<SettingsStackParamList, 'SettingsMoneyHousehold'>) {
  const [status, setStatus] = useState<MoneyFamilyStatus | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const client = getSupabaseClient();

  const load = useCallback(async () => {
    try {
      setStatus(await getMoneyFamilyStatus(client));
    } catch (error) {
      Alert.alert('Unable to load Money household', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => { void load(); }, [load]);

  const join = async () => {
    if (joining) return;
    setJoining(true);
    try {
      setStatus(await acceptMoneyFamilyInvite(client, code));
      setCode('');
    } catch (error) {
      Alert.alert('Unable to join household', error instanceof Error ? error.message : 'Check the code and try again.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <SettingsPage onBack={() => navigation.goBack()} title="Money household">
      <SettingsGroup footer="Money household membership reuses your signed-in Kwilt identity; there is no second account." title="Household">
        <SettingsRow title="Name" value={loading ? 'Loading…' : status?.householdName ?? 'Not joined'} />
        <SettingsDivider />
        <SettingsRow title="Role" value={status?.role ?? 'None'} />
        <SettingsDivider />
        <SettingsRow title="Members" value={String(status?.memberCount ?? 0)} />
      </SettingsGroup>

      {!status?.householdId ? (
        <SettingsGroup footer="Invite acceptance is deployed and JWT-protected. Enter a code shared by the household owner." title="Join">
          <Input autoCapitalize="characters" label="Invite code" onChangeText={setCode} value={code} />
          <Button disabled={joining || code.trim().length < 6} fullWidth onPress={() => void join()}>
            {joining ? 'Joining…' : 'Join household'}
          </Button>
        </SettingsGroup>
      ) : null}

      {status?.role === 'owner' ? (
        <SettingsGroup footer="Creating new Money household invites is not deployed in unified Kwilt yet. The frozen integration contract requires a separate family-write decision before that production endpoint is added.">
          <SettingsRow disabled title="Invite another member" value="Not deployed" />
        </SettingsGroup>
      ) : null}
    </SettingsPage>
  );
}
