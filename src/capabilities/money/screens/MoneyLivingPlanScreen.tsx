import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import {
  SettingsDivider,
  SettingsGroup,
  SettingsPage,
  SettingsRow,
  SettingsToggleRow,
} from '../../../ui/SettingsSurface';
import {
  getLivingPlanSettings,
  saveLivingPlanPromotionEnabled,
  saveLivingTargetIntent,
  type LivingPlanSettingsSnapshot,
} from '../data/livingPlanRepository';
import type { MoneyStackParamList } from '../navigation/types';
import { reconcileLivingPlan } from '../runtime/livingPlanReconciliation';

export function MoneyLivingPlanScreen({ navigation }: NativeStackScreenProps<MoneyStackParamList, 'MoneyLivingPlan'>) {
  const [state, setState] = useState<LivingPlanSettingsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const client = getSupabaseClient();

  const load = useCallback(async () => {
    try {
      setState(await getLivingPlanSettings(client));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Automatic plan settings could not be loaded.');
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
      if (state?.promotionEnabled) {
        const result = await reconcileLivingPlan(client, 'target_changed');
        setStatus(reconciliationCopy(result));
      } else {
        setStatus(`Living target saved at ${livingPercent}%.`);
      }
      await load();
    } catch (error) {
      Alert.alert('Unable to update living target', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAutomaticPlan = async () => {
    if (saving) return;
    const enabled = !state?.promotionEnabled;
    setSaving(true);
    setStatus(null);
    try {
      await saveLivingPlanPromotionEnabled(client, enabled);
      if (enabled) {
        if (!state?.target) {
          await saveLivingTargetIntent(client, { livingPercent: 80, provenance: 'settings', updatedAtIso: new Date().toISOString() });
        }
        const result = await reconcileLivingPlan(client, 'target_changed');
        setStatus(reconciliationCopy(result));
      } else {
        setStatus('Automatic plan updates are off. Your current category amounts stay in place.');
      }
      await load();
    } catch (error) {
      Alert.alert('Unable to update automatic plans', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const livingPercent = state?.target?.livingPercent ?? 80;
  return (
    <SettingsPage onBack={() => navigation.goBack()} title="Automatic plan">
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
        footer="When current connected-account evidence supports a change, Kwilt writes one versioned plan and a reversible receipt. Stale or missing evidence blocks promotion."
        title="Updates"
      >
        <SettingsToggleRow
          disabled={loading || saving}
          enabled={state?.promotionEnabled === true}
          onPress={() => void toggleAutomaticPlan()}
          title="Update category plans automatically"
        />
        {state?.active ? (
          <>
            <SettingsDivider />
            <SettingsRow title="Active plan" value={`${state.active.livingPercent}% target`} />
          </>
        ) : null}
      </SettingsGroup>

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
  if (result.outcome === 'blocked') return 'No plan changed because connected-account evidence is stale or incomplete.';
  if (result.outcome === 'disabled') return 'Automatic plan updates are disabled.';
  return 'Kwilt needs a living target and enough connected-account history before it can build this plan.';
}
