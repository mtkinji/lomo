import { SettingsDivider, SettingsGroup, SettingsRow, SettingsTextInputRow, SettingsToggleRow } from '../../../ui/SettingsSurface';
import { EnumPickerField } from '../../../ui/PickerFields';
import { formatMoney } from '../data/moneySnapshot';
import { formatRolloverMonth } from '../domain/categoryRollover';
import type { RolloverDraft, reviewRolloverDraft } from '../domain/rolloverDraft';

type Props = {
  draft: RolloverDraft;
  onChange: (draft: RolloverDraft) => void;
  review: ReturnType<typeof reviewRolloverDraft>;
  currentMonth: string;
  monthlyAmountCents: number;
  spentCents: number;
  disabled: boolean;
};
export function MoneyRolloverSettings({ draft, onChange, review, currentMonth, monthlyAmountCents, spentCents, disabled }: Props) {
  const [year, month] = currentMonth.split('-').map(Number);
  const choices = Array.from({ length: 120 }, (_, offset) => {
    const date = new Date(year, month - 1 - offset, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { value, label: formatRolloverMonth(value) };
  });
  if (!choices.some((choice) => choice.value === draft.startMonth)) choices.push({ value: draft.startMonth, label: formatRolloverMonth(draft.startMonth) });
  return <>
    <SettingsGroup title="ROLLOVER" footer={draft.enabled ? `Unused money carries forward; overspending reduces next month’s amount. Starting balance is what you bring into ${formatRolloverMonth(draft.startMonth)}, before that month’s budget and spending.` : undefined}>
      <SettingsToggleRow title="Rollover" enabled={draft.enabled} disabled={disabled} onPress={() => onChange({ ...draft, enabled: !draft.enabled })} />
      {draft.enabled ? <>
        <SettingsDivider />
        <EnumPickerField
          title="Start month" placeholder="Choose a month" accessibilityLabel="Rollover start month"
          options={choices} value={draft.startMonth} disabled={disabled}
          onValueChange={(startMonth) => onChange({ ...draft, startMonth, historyReviewed: false })}
          renderTrigger={({ selectedLabel, onPress }) => <SettingsRow title="Start month" value={selectedLabel} onPress={onPress} disabled={disabled} />}
        />
        {draft.startMonth !== `${year}-01` ? <SettingsRow title="Start in January this year" onPress={() => onChange({ ...draft, startMonth: `${year}-01`, historyReviewed: false })} disabled={disabled} /> : null}
        <SettingsDivider />
        <SettingsTextInputRow label="Starting balance" value={draft.balance} keyboardType="numbers-and-punctuation" editable={!disabled}
          accessibilityHint={`Amount carried into ${formatRolloverMonth(draft.startMonth)}, before that month's budget and spending. Can be negative.`}
          onChangeText={(balance) => onChange({ ...draft, balance })} />
      </> : null}
    </SettingsGroup>
    {draft.enabled ? <>
      {draft.startMonth < currentMonth ? <SettingsGroup>
          <SettingsTextInputRow label="Earlier monthly budget" value={draft.historicalAmount} keyboardType="decimal-pad" editable={!disabled}
            onChangeText={(historicalAmount) => onChange({ ...draft, historicalAmount, historyReviewed: false })} />
          {review.historyRequired ? <SettingsToggleRow title="I’ve reviewed the earlier spending" description="Use this monthly amount for the earlier months. Check that spending from all relevant accounts is included."
            enabled={draft.historyReviewed} disabled={disabled || !review.preview} onPress={() => onChange({ ...draft, historyReviewed: !draft.historyReviewed })} /> : null}
      </SettingsGroup> : null}
      {review.preview ? <SettingsGroup title={`PREVIEW · ${formatRolloverMonth(currentMonth).toUpperCase()}`} footer={review.error ?? undefined}>
        <SettingsRow title="Rolled in" value={formatMoney(review.preview.carriedInCents)} />
        <SettingsRow title="Monthly budget" value={formatMoney(monthlyAmountCents)} />
        <SettingsRow title="Spent this month" value={formatMoney(spentCents)} />
        <SettingsDivider />
        <SettingsRow title="Remaining" value={formatMoney(review.preview.availableCents)} />
      </SettingsGroup> : <SettingsGroup footer={review.error ?? undefined}>
        <SettingsRow title="Start this month instead" disabled={disabled} onPress={() => onChange({ ...draft, startMonth: currentMonth, historyReviewed: false })} />
      </SettingsGroup>}
    </> : null}
  </>;
}
