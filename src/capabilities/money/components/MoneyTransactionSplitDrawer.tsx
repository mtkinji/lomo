import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing, typography } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { Input } from '../../../ui/Input';
import {
  buildTransactionAllocationPlan,
  formatAllocationAmountInput,
  MAX_TRANSACTION_ALLOCATION_COUNT,
  parseAllocationAmountCents,
  type TransactionAllocationInput,
} from '../domain/transactionAllocation';
import { formatMoney, type MoneyCategory, type MoneyTransaction } from '../data/moneySnapshot';

export function MoneyTransactionSplitDrawer({
  categories,
  onClose,
  onSave,
  saving,
  transaction,
  visible,
}: {
  categories: MoneyCategory[];
  onClose: (allocationCount: number) => void;
  onSave: (allocations: TransactionAllocationInput[]) => Promise<void>;
  saving: boolean;
  transaction: MoneyTransaction;
  visible: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    if (transaction.allocations?.length) {
      setSelectedIds(transaction.allocations.map((allocation) => allocation.sourceCategoryId));
      setAmounts(Object.fromEntries(transaction.allocations.map((allocation) => [
        allocation.sourceCategoryId,
        formatAllocationAmountInput(allocation.amountCents),
      ])));
      return;
    }
    const currentSourceId = categories.find((category) => category.id === transaction.categoryId)?.sourceId;
    const initialIds = [
      ...(currentSourceId ? [currentSourceId] : []),
      ...categories.map((category) => category.sourceId).filter((id) => id !== currentSourceId),
    ].slice(0, 2);
    setSelectedIds(initialIds);
    setAmounts(currentSourceId ? { [currentSourceId]: formatAllocationAmountInput(transaction.amountCents) } : {});
  }, [categories, transaction, visible]);

  const plan = useMemo(() => buildTransactionAllocationPlan({
    transactionAmountCents: transaction.amountCents,
    direction: transaction.direction,
    pending: transaction.pending,
    allocations: selectedIds.map((categoryId) => ({
      categoryId,
      amountCents: parseAllocationAmountCents(amounts[categoryId] ?? '') ?? 0,
    })),
  }), [amounts, selectedIds, transaction.amountCents, transaction.direction, transaction.pending]);

  const toggleCategory = (categoryId: string) => {
    setSelectedIds((current) => current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : current.length < MAX_TRANSACTION_ALLOCATION_COUNT ? [...current, categoryId] : current);
    setAmounts((current) => ({ ...current, [categoryId]: current[categoryId] ?? '' }));
  };

  return (
    <BottomDrawer visible={visible} onClose={() => onClose(selectedIds.length)} snapPoints={['92%']} enableContentPanningGesture>
      <BottomDrawerScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>MIXED PURCHASE</Text>
            <Text style={styles.title}>Split transaction</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close transaction split" onPress={() => onClose(selectedIds.length)} style={styles.closeButton}>
            <Icon name="close" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
        <Text style={styles.copy}>Assign every cent once. The transaction remains one bank record while each category meter receives only its share.</Text>

        <View style={styles.totalCard}>
          <SummaryRow label="Transaction" value={formatMoney(transaction.amountCents, transaction.currencyCode)} />
          <SummaryRow label="Allocated" value={formatMoney(plan.allocatedCents, transaction.currencyCode)} />
          <SummaryRow label="Remaining" value={formatMoney(Math.abs(plan.remainingCents), transaction.currencyCode)} tone={plan.remainingCents === 0 ? 'success' : 'warning'} />
        </View>

        <View style={styles.categoryList}>
          {categories.map((category) => {
            const selected = selectedIds.includes(category.sourceId);
            return (
              <View key={category.sourceId} style={[styles.categoryCard, selected ? styles.categoryCardSelected : null]}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`Split into ${category.name}`}
                  onPress={() => toggleCategory(category.sourceId)}
                  style={styles.categoryToggle}
                >
                  <View style={[styles.check, selected ? styles.checkSelected : null]}>
                    {selected ? <Icon name="check" size={14} color={colors.canvas} /> : null}
                  </View>
                  <View style={[styles.dot, { backgroundColor: category.accentColor }]} />
                  <Text style={styles.categoryName}>{category.name}</Text>
                </Pressable>
                {selected ? (
                  <Input
                    accessibilityLabel={`${category.name} allocation amount`}
                    label="Amount"
                    keyboardType="decimal-pad"
                    value={amounts[category.sourceId] ?? ''}
                    onChangeText={(value) => setAmounts((current) => ({ ...current, [category.sourceId]: value }))}
                    placeholder="0.00"
                    size="sm"
                    trailingElement={(
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Done editing allocation"
                        onPress={Keyboard.dismiss}
                        style={styles.inputDoneButton}
                      >
                        <Text style={styles.inputDoneText}>Done</Text>
                      </Pressable>
                    )}
                  />
                ) : null}
              </View>
            );
          })}
        </View>

        {!plan.valid ? <Text accessibilityRole="alert" style={styles.error}>{plan.error}</Text> : null}
        <Button disabled={!plan.valid || saving} fullWidth onPress={() => void onSave(plan.allocations)}>
          {saving ? 'Saving split…' : 'Save split'}
        </Button>
        <Button fullWidth variant="ghost" onPress={() => onClose(selectedIds.length)}>Cancel</Button>
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

function SummaryRow({ label, tone, value }: { label: string; tone?: 'success' | 'warning'; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, tone === 'success' ? styles.success : tone === 'warning' ? styles.warning : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: 64 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, fontWeight: '600', letterSpacing: 0.7 },
  title: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 24, lineHeight: 29, fontWeight: '700' },
  copy: { ...typography.bodySm, color: colors.textSecondary },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: colors.gray100 },
  totalCard: { gap: spacing.sm, padding: spacing.lg, borderRadius: 12, backgroundColor: colors.gray50 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg },
  summaryLabel: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  summaryValue: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, fontWeight: '600', fontVariant: ['tabular-nums'] },
  success: { color: colors.pine700 },
  warning: { color: colors.turmeric700 },
  categoryList: { gap: spacing.sm },
  categoryCard: { gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, backgroundColor: colors.card },
  categoryCardSelected: { borderColor: colors.pine300, backgroundColor: colors.pine50 },
  categoryToggle: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  check: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gray300, borderRadius: 7, backgroundColor: colors.canvas },
  checkSelected: { borderColor: colors.pine700, backgroundColor: colors.pine700 },
  dot: { width: 10, height: 10, borderRadius: 999 },
  categoryName: { flex: 1, color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  error: { color: colors.destructive, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  inputDoneButton: { minHeight: 32, justifyContent: 'center', paddingHorizontal: spacing.xs },
  inputDoneText: {
    color: colors.pine700,
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
});
