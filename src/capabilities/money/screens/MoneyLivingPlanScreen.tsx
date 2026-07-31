import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
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
  savePlanningBasisOverride,
  saveLivingTargetIntent,
  type LivingPlanSettingsSnapshot,
} from '../data/livingPlanRepository';
import type { MoneyStackParamList } from '../navigation/types';
import { reconcileLivingPlan } from '../runtime/livingPlanReconciliation';
import { parseMonthlyAmount } from '../domain/categoryPlanDraft';
import { MoneyWeeklyCheckRow } from '../components/MoneyWeeklyCheckRow';
import { useFeatureFlag } from '../../../services/analytics/useFeatureFlag';

export function MoneyLivingPlanScreen({ navigation }: NativeStackScreenProps<MoneyStackParamList, 'MoneyLivingPlan'>) {
  const [state, setState] = useState<LivingPlanSettingsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [planningBasisDraft, setPlanningBasisDraft] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const client = getSupabaseClient();
  const livingLimitEnabled = useFeatureFlag('money-living-limit-answer', __DEV__);

  const load = useCallback(async () => {
    try {
      const [next, authResult] = await Promise.all([getLivingPlanSettings(client), client.auth.getUser()]);
      setState(next);
      setUserId(authResult.data.user?.id ?? null);
      setPlanningBasisDraft(next.planningBasis ? (next.planningBasis.monthlyBasisCents / 100).toFixed(2) : '');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Money plan settings could not be loaded.');
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

  const livingPercent = state?.target?.livingPercent ?? 80;
  return (
    <SettingsPage onBack={() => navigation.goBack()} title="Money plan">
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

      {livingLimitEnabled && userId ? <MoneyWeeklyCheckRow userId={userId} /> : null}

      {status ? <SettingsGroup footer={status}><SettingsRow title="Latest result" /></SettingsGroup> : null}

      {state?.receipts.length ? (
        <SettingsGroup footer="Receipts explain what changed and offer reversal only while that version remains active." title="Recent receipts">
          {state.receipts.map((receipt, index) => (
            <ReceiptRow
              key={receipt.id}
              divider={index > 0}
              onPress={() => navigation.navigate('MoneyLivingPlanReceipt', { receiptId: receipt.id })}
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
