import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { SettingsDivider, SettingsGroup, SettingsPage, SettingsRow } from '../../../ui/SettingsSurface';
import {
  getLivingPlanReceiptDetail,
  markLivingPlanReceiptSeen,
  reverseLivingPlan,
  type LivingPlanReceiptDetail,
} from '../data/livingPlanRepository';
import { formatMoney } from '../data/moneySnapshot';
import { getLivingPlanReceiptSummary } from '../domain/living-plan-receipt';
import type { MoneyStackParamList } from '../navigation/types';
import { useMoneyData } from '../data/MoneyDataContext';

export function MoneyLivingPlanReceiptScreen({ navigation, route }: NativeStackScreenProps<MoneyStackParamList, 'MoneyLivingPlanReceipt'>) {
  const { refresh, snapshot } = useMoneyData();
  const [detail, setDetail] = useState<LivingPlanReceiptDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reversing, setReversing] = useState(false);
  const client = getSupabaseClient();

  useEffect(() => {
    let mounted = true;
    void getLivingPlanReceiptDetail(client, route.params.receiptId)
      .then((next) => {
        if (mounted) setDetail(next);
        return markLivingPlanReceiptSeen(client, next.id);
      })
      .catch((cause) => { if (mounted) setError(cause instanceof Error ? cause.message : 'This receipt could not be loaded.'); });
    return () => { mounted = false; };
  }, [client, route.params.receiptId]);

  const reverse = async () => {
    if (!detail?.priorVersionId || reversing) return;
    setReversing(true);
    try {
      await reverseLivingPlan(client, detail.activeVersionId, detail.priorVersionId);
      await refresh();
      navigation.goBack();
    } catch (cause) {
      Alert.alert('Unable to reverse plan', cause instanceof Error ? cause.message : 'The active plan may have changed.');
    } finally {
      setReversing(false);
    }
  };

  const summary = detail ? getLivingPlanReceiptSummary({ before: detail.before, after: detail.after, changedCategoryCount: detail.changed.length }) : null;
  return (
    <SettingsPage onBack={() => navigation.goBack()} title="Plan receipt">
      {error ? <SettingsGroup footer={error}><SettingsRow title="Receipt unavailable" /></SettingsGroup> : null}
      {detail && summary ? (
        <>
          <SettingsGroup footer={detail.cause} title={summary.headline}>
            <SettingsRow title="Living limit" value={`${detail.after.livingPercent}% · ${formatMoney(detail.after.targetCents)}`} />
            <SettingsDivider />
            <SettingsRow title="Plan result" value={detail.after.overTargetCents > 0 ? `${formatMoney(detail.after.overTargetCents)} over` : 'Within limit'} />
            <SettingsDivider />
            <SettingsRow title="Protected plan" value={formatMoney(detail.after.protectedPlanCents)} />
            <SettingsDivider />
            <SettingsRow title="Flexible capacity" value={formatMoney(detail.after.flexibleCapacityCents)} />
          </SettingsGroup>
          {detail.changed.length ? (
            <SettingsGroup footer={summary.explanation} title="Category changes">
              {detail.changed.map((change, index) => {
                const category = snapshot?.categories.find((item) => item.id === change.categoryId || item.sourceId === change.categoryId);
                return (
                  <ReceiptChangeRow
                    key={change.categoryId}
                    divider={index > 0}
                    title={category?.name ?? change.categoryId}
                    value={`${change.beforeCents == null ? 'New' : formatMoney(change.beforeCents)} → ${change.afterCents == null ? 'Removed' : formatMoney(change.afterCents)}`}
                  />
                );
              })}
            </SettingsGroup>
          ) : null}
          {detail.reversible && detail.priorVersionId ? (
            <SettingsGroup footer="Reversal creates a new auditable version from the prior plan; it does not erase this receipt.">
              <SettingsRow disabled={reversing} onPress={() => void reverse()} title={reversing ? 'Reversing…' : 'Return to the prior plan'} />
            </SettingsGroup>
          ) : null}
        </>
      ) : null}
    </SettingsPage>
  );
}

function ReceiptChangeRow({ divider, title, value }: { divider: boolean; title: string; value: string }) {
  return <>{divider ? <SettingsDivider /> : null}<SettingsRow title={title} value={value} /></>;
}
