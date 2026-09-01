import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { SettingsDivider, SettingsGroup, SettingsPage, SettingsRow } from '../../../ui/SettingsSurface';
import {
  getMoneyFamilyStatus,
  type MoneyFamilyStatus,
} from '../data/moneyFamilySharing';
import type { SettingsStackParamList } from '../../../navigation/RootNavigator';

export function MoneyHouseholdSettingsScreen({ navigation }: NativeStackScreenProps<SettingsStackParamList, 'SettingsMoneyHousehold'>) {
  const [status, setStatus] = useState<MoneyFamilyStatus | null>(null);
  const [loading, setLoading] = useState(true);
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

  return (
    <SettingsPage onBack={() => navigation.goBack()} title="Money household">
      <SettingsGroup footer="Household owners and caregivers can see and manage shared budgets automatically. Child profiles do not get Money access." title="Household">
        <SettingsRow title="Name" value={loading ? 'Loading…' : status?.householdName ?? 'Not joined'} />
        <SettingsDivider />
        <SettingsRow title="Role" value={status?.role ?? 'None'} />
        <SettingsDivider />
        <SettingsRow title="Adults with access" value={String(status?.memberCount ?? 0)} />
      </SettingsGroup>

      <SettingsGroup footer="Add or remove people from the main Household settings. Money access follows active adult membership.">
        <SettingsRow
          onPress={() => navigation.navigate('SettingsHousehold')}
          title={status?.householdId ? 'Manage Household' : 'Set up Household'}
          value="Open"
        />
      </SettingsGroup>
    </SettingsPage>
  );
}
