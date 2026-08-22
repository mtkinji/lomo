import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { SettingsStackParamList } from '../../../navigation/RootNavigator';
import { rootNavigationRef } from '../../../navigation/rootNavigationRef';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import {
  SettingsDivider,
  SettingsGroup,
  SettingsPage,
  SettingsRow,
} from '../../../ui/SettingsSurface';
import { Input } from '../../../ui/Input';
import { Button } from '../../../ui/Button';
import { spacing } from '../../../theme';
import {
  getLivingPlanSettings,
  restoreDefaultBudgetCategories,
  savePlanningBasisOverride,
  saveLivingTargetIntent,
  type LivingPlanSettingsSnapshot,
} from '../data/livingPlanRepository';
import type { MoneyStackParamList } from '../navigation/types';
import { reconcileLivingPlan } from '../runtime/livingPlanReconciliation';
import { parseMonthlyAmount } from '../domain/categoryPlanDraft';
import { MoneyWeeklyCheckRow } from '../components/MoneyWeeklyCheckRow';

export function MoneyLivingPlanScreen({ navigation }: NativeStackScreenProps<MoneyStackParamList, 'MoneyLivingPlan'>) {
  return (
    <BudgetSettingsSurface
      onBack={() => navigation.goBack()}
      onOpenHouseholdAccess={() => rootNavigationRef.navigate('Settings', { screen: 'SettingsMoneyHousehold' })}
      onOpenPrivacyLock={() => rootNavigationRef.navigate('Settings', { screen: 'SettingsMoneyPrivacy' })}
      onOpenReceipt={(receiptId) => navigation.navigate('MoneyLivingPlanReceipt', { receiptId })}
    />
  );
}

export function BudgetSettingsScreen({ navigation }: NativeStackScreenProps<SettingsStackParamList, 'SettingsBudget'>) {
  return (
    <BudgetSettingsSurface
      onBack={() => navigation.goBack()}
      onOpenHouseholdAccess={() => navigation.navigate('SettingsMoneyHousehold')}
      onOpenPrivacyLock={() => navigation.navigate('SettingsMoneyPrivacy')}
      onOpenReceipt={(receiptId) => rootNavigationRef.navigate('Money', {
        screen: 'MoneyLivingPlanReceipt',
        params: { receiptId },
      })}
    />
  );
}

export function BudgetSettingsSurface({
  onBack,
  onOpenHouseholdAccess,
  onOpenPrivacyLock,
  onOpenReceipt,
}: {
  onBack: () => void;
  onOpenHouseholdAccess: () => void;
  onOpenPrivacyLock: () => void;
  onOpenReceipt: (receiptId: string) => void;
}) {
  const [state, setState] = useState<LivingPlanSettingsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoringCategories, setRestoringCategories] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [planningBasisDraft, setPlanningBasisDraft] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const client = getSupabaseClient();

  const load = useCallback(async () => {
    try {
      const [next, authResult] = await Promise.all([getLivingPlanSettings(client), client.auth.getUser()]);
      setState(next);
      setUserId(authResult.data.user?.id ?? null);
      setPlanningBasisDraft(next.planningBasis ? (next.planningBasis.monthlyBasisCents / 100).toFixed(2) : '');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Budget settings could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => { void load(); }, [load]);

  const saveTarget = async (livingPercent: number) => {
    if (saving) return;
    setSaving(true);
    setStatus(null);
    try {
      await saveLivingTargetIntent(client, {
        livingPercent,
        provenance: 'settings',
        updatedAtIso: new Date().toISOString(),
      });
      const result = await reconcileLivingPlan(client, 'target_changed');
      setStatus(reconciliationCopy(result));
      await load();
    } catch (error) {
      Alert.alert('Unable to update living target', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const savePlanningBasis = async () => {
    if (saving) return;
    setSaving(true);
    setStatus(null);
    try {
      await savePlanningBasisOverride(client, parseMonthlyAmount(planningBasisDraft));
      const result = await reconcileLivingPlan(client, 'planning_basis_changed');
      setStatus(reconciliationCopy(result));
      await load();
    } catch (error) {
      Alert.alert('Unable to update planning amount', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const restoreCategories = async () => {
    if (restoringCategories) return;
    setRestoringCategories(true);
    setStatus(null);
    try {
      const receipt = await restoreDefaultBudgetCategories(client);
      setStatus(receipt.createdCategoryCount === 0
        ? 'All default categories are already available.'
        : `${receipt.createdCategoryCount} default ${receipt.createdCategoryCount === 1 ? 'category was' : 'categories were'} restored.`);
    } catch (error) {
      Alert.alert('Unable to restore default categories', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setRestoringCategories(false);
    }
  };

  const confirmRestoreCategories = () => {
    Alert.alert(
      'Restore default categories?',
      'This adds any missing Budget defaults. Your existing categories, names, amounts, and transaction assignments stay unchanged.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', onPress: () => void restoreCategories() },
      ],
    );
  };

  const livingPercent = state?.target?.livingPercent ?? 80;
  return (
    <SettingsPage onBack={onBack} title="Budget">
      <SettingsGroup
        footer="Your living target is the share of trustworthy monthly income available for category plans. Kwilt preserves fixed and user-set amounts first."
        title="Living target"
      >
        <SettingsRow title="Target" value={loading ? 'Loading…' : `${livingPercent}%`} />
        <SettingsDivider />
        <SettingsRow disabled={saving || livingPercent <= 50} onPress={() => void saveTarget(Math.max(50, livingPercent - 5))} title="Use 5% less" />
        <SettingsDivider />
        <SettingsRow disabled={saving || livingPercent >= 100} onPress={() => void saveTarget(Math.min(100, livingPercent + 5))} title="Use 5% more" />
      </SettingsGroup>

      <SettingsGroup
        footer="Set one stable monthly amount when connected accounts cannot support it—or when you want your own number to govern the plan. Current deposits will not change it."
        title="Monthly planning amount"
      >
        <View style={styles.inputBlock}>
          <Input editable={!saving} keyboardType="decimal-pad" label="Monthly amount" onChangeText={setPlanningBasisDraft} value={planningBasisDraft} />
          <Button disabled={saving || !planningBasisDraft.trim()} fullWidth onPress={() => void savePlanningBasis()}>{saving ? 'Saving…' : 'Use this amount'}</Button>
        </View>
      </SettingsGroup>

      <SettingsGroup
        footer="Activity updates now. Automatic contribution changes start next month. Changes you explicitly save apply now and create a receipt."
        title="Plan timing"
      >
        <SettingsRow title="Current plan" value={state?.active ? `${state.active.livingPercent}% target` : loading ? 'Loading…' : 'Not ready'} />
      </SettingsGroup>

      {userId ? <MoneyWeeklyCheckRow userId={userId} /> : null}

      <SettingsGroup
        footer="Adds only missing Kwilt defaults. Existing categories, names, amounts, and transaction assignments stay unchanged."
        title="Categories"
      >
        <SettingsRow
          disabled={restoringCategories}
          onPress={confirmRestoreCategories}
          title="Restore default categories"
          value={restoringCategories ? 'Restoring…' : undefined}
        />
      </SettingsGroup>

      <SettingsGroup title="Privacy & access">
        <SettingsRow onPress={onOpenPrivacyLock} title="Privacy lock" />
        <SettingsDivider />
        <SettingsRow onPress={onOpenHouseholdAccess} title="Household access" />
      </SettingsGroup>

      {status ? <SettingsGroup footer={status}><SettingsRow title="Latest result" /></SettingsGroup> : null}

      {state?.receipts.length ? (
        <SettingsGroup footer="Receipts explain what changed and offer reversal only while that version remains active." title="Recent receipts">
          {state.receipts.map((receipt, index) => (
            <ReceiptRow
              key={receipt.id}
              divider={index > 0}
              onPress={() => onOpenReceipt(receipt.id)}
              title={receipt.cause}
              value={receipt.seenAtIso ? undefined : 'New'}
            />
          ))}
        </SettingsGroup>
      ) : null}
    </SettingsPage>
  );
}

function ReceiptRow({ divider, onPress, title, value }: { divider: boolean; onPress: () => void; title: string; value?: string }) {
  return <>{divider ? <SettingsDivider /> : null}<SettingsRow onPress={onPress} title={title} value={value} /></>;
}

function reconciliationCopy(result: Awaited<ReturnType<typeof reconcileLivingPlan>>): string {
  if (result.outcome === 'promoted') return 'Category plans were updated from current evidence. A receipt is ready.';
  if (result.outcome === 'no_op') return 'Current category plans already match the supported plan.';
  if (result.outcome === 'held') return `Current money is up to date. Automatic contribution changes are ready for ${result.activationPeriodId}.`;
  if (result.outcome === 'blocked') return 'No plan changed because connected-account evidence is stale or incomplete.';
  if (result.outcome === 'disabled') return 'Plan maintenance is temporarily paused. Your current plan stays in place.';
  return 'Kwilt needs a living target and enough connected-account history before it can build this plan.';
}

const styles = StyleSheet.create({
  inputBlock: { gap: spacing.md, padding: spacing.md },
});
