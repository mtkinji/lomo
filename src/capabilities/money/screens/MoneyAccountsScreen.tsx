import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { colors, fonts, spacing, typography } from '../../../theme';
import { Icon, type IconName } from '../../../ui/Icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../ui/DropdownMenu';
import { menuItemTextProps, menuStyles } from '../../../ui/menuStyles';
import {
  MoneyInventoryControlGroup,
  MoneyInventoryControlSurface,
  MoneyInventoryListFrame,
} from '../components/MoneyInventoryListFrame';
import { useMoneyData } from '../data/MoneyDataContext';
import { syncMoneyTransactions } from '../data/moneyPlaidApi';
import { formatMoneyFreshness, type MoneyAccount } from '../data/moneySnapshot';
import { startMoneyPlaidLink } from '../native/moneyPlaidLink';
import type { MoneyStackParamList } from '../navigation/types';
import { MoneyScreenFrame } from './MoneyScreenFrame';

type AccountFilter = 'all' | 'linked' | 'needs_review';
type AccountSort = 'name' | 'transactions_high' | 'status';

const FILTER_OPTIONS: Array<{ value: AccountFilter; label: string }> = [
  { value: 'all', label: 'All accounts' },
  { value: 'linked', label: 'Feeds meters' },
  { value: 'needs_review', label: 'Needs lane' },
];
const SORT_OPTIONS: Array<{ value: AccountSort; label: string }> = [
  { value: 'name', label: 'Name A-Z' },
  { value: 'transactions_high', label: 'Transactions high to low' },
  { value: 'status', label: 'Needs lane first' },
];

export function MoneyAccountsScreen({ navigation }: NativeStackScreenProps<MoneyStackParamList, 'MoneyAccounts'>) {
  const { snapshot, refresh } = useMoneyData();
  const [filter, setFilter] = useState<AccountFilter>('all');
  const [sort, setSort] = useState<AccountSort>('name');
  const [connectionAction, setConnectionAction] = useState<'linking' | 'syncing' | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const accounts = snapshot?.accounts ?? [];
  const visibleAccounts = useMemo(() => sortAccounts(accounts.filter((account) => (
    filter === 'all' || (filter === 'linked' ? account.transactionCount > 0 : account.transactionCount === 0)
  )), sort), [accounts, filter, sort]);

  const connectAccount = async () => {
    if (connectionAction) return;
    setConnectionAction('linking');
    setConnectionMessage('Opening a secure Plaid connection…');
    try {
      const result = await startMoneyPlaidLink();
      if (result.status === 'cancelled') {
        setConnectionMessage('Account connection closed without changes.');
        return;
      }
      await refresh();
      setConnectionMessage(`${result.exchange.institutionName} connected and synced.`);
    } catch (error) {
      setConnectionMessage(error instanceof Error ? error.message : 'The account could not be connected.');
    } finally {
      setConnectionAction(null);
    }
  };

  const syncAccounts = async () => {
    if (connectionAction) return;
    setConnectionAction('syncing');
    setConnectionMessage('Checking…');
    try {
      const result = await syncMoneyTransactions(getSupabaseClient());
      await refresh();
      setConnectionMessage(result.added > 0 ? `${result.added} new ${result.added === 1 ? 'transaction' : 'transactions'}` : 'Accounts are up to date');
    } catch (error) {
      setConnectionMessage(error instanceof Error ? error.message : 'Unable to check right now');
    } finally {
      setConnectionAction(null);
    }
  };

  return (
    <MoneyScreenFrame title="Accounts">
      <MoneyInventoryListFrame
        controls={(
          <MoneyInventoryControlGroup>
            <IconMenu iconName="funnel" active={filter !== 'all'} count={filter !== 'all' ? 1 : 0} accessibilityLabel="Filter accounts">
              {FILTER_OPTIONS.map((option) => <AccountMenuItem key={option.value} active={filter === option.value} label={option.label} onPress={() => setFilter(option.value)} />)}
            </IconMenu>
            <IconMenu iconName="sort" active={sort !== 'name'} count={sort !== 'name' ? 1 : 0} accessibilityLabel="Sort accounts">
              {SORT_OPTIONS.map((option, index) => (
                <View key={option.value}>
                  {index === 1 ? <DropdownMenuSeparator /> : null}
                  <AccountMenuItem active={sort === option.value} label={option.label} onPress={() => setSort(option.value)} />
                </View>
              ))}
            </IconMenu>
          </MoneyInventoryControlGroup>
        )}
        count={{ visible: visibleAccounts.length, total: accounts.length }}
        variant="cards"
        contentStyle={styles.accountList}
        action={(
          <View style={styles.actionGroup}>
            <Pressable accessibilityRole="button" accessibilityLabel="Check for new activity" disabled={Boolean(connectionAction)} hitSlop={10} onPress={() => void syncAccounts()} style={({ pressed }) => [styles.iconButton, connectionAction ? styles.iconButtonDisabled : null, pressed ? styles.iconButtonPressed : null]}>
              <Icon name="refresh" size={18} color={colors.textPrimary} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Connect account" disabled={Boolean(connectionAction)} hitSlop={10} onPress={() => void connectAccount()} style={({ pressed }) => [styles.iconButton, connectionAction ? styles.iconButtonDisabled : null, pressed ? styles.iconButtonPressed : null]}>
              <Icon name="plus" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
        )}
      >
        <View style={styles.freshnessRow}>
          <Text numberOfLines={1} style={styles.freshnessText}>{formatMoneyFreshness(snapshot?.lastSyncedAt ?? null)}</Text>
          {connectionMessage ? <Text numberOfLines={1} style={styles.activityCheckText}>{connectionMessage}</Text> : null}
        </View>
        {visibleAccounts.length > 0 ? visibleAccounts.map((account) => (
          <AccountInventoryRow key={account.id} account={account} onPress={() => navigation.navigate('MoneyTransactions', { accountId: account.id })} />
        )) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{accounts.length > 0 ? 'No accounts in this view' : 'No Plaid accounts yet'}</Text>
            <Text style={styles.emptyCopy}>{accounts.length > 0 ? 'Adjust the filter to review the rest of the account inventory.' : 'Connect an account to populate account rows.'}</Text>
          </View>
        )}
      </MoneyInventoryListFrame>
    </MoneyScreenFrame>
  );
}

function IconMenu({ accessibilityLabel, active, children, count, iconName }: {
  accessibilityLabel: string; active: boolean; children: ReactNode; count: number; iconName: IconName;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger accessibilityLabel={accessibilityLabel}>
        <View pointerEvents="none"><MoneyInventoryControlSurface iconName={iconName} active={active} count={count} /></View>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" sideOffset={6} align="start">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountMenuItem({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <DropdownMenuItem onPress={onPress} accessibilityLabel={label}>
      <View style={menuStyles.menuItemRow}>
        <Icon name={active ? 'check' : 'dot'} size={18} color={active ? colors.pine700 : colors.textSecondary} />
        <Text style={menuStyles.menuItemText} {...menuItemTextProps}>{label}</Text>
      </View>
    </DropdownMenuItem>
  );
}

function sortAccounts(accounts: MoneyAccount[], sort: AccountSort): MoneyAccount[] {
  return [...accounts].sort((left, right) => {
    if (sort === 'transactions_high') return right.transactionCount - left.transactionCount;
    if (sort === 'status') {
      const delta = Number(left.transactionCount > 0) - Number(right.transactionCount > 0);
      if (delta !== 0) return delta;
    }
    return left.name.localeCompare(right.name);
  });
}

function AccountInventoryRow({ account, onPress }: { account: MoneyAccount; onPress: () => void }) {
  const transactionSummary = account.transactionCount > 0 ? `${account.transactionCount} ${account.transactionCount === 1 ? 'transaction' : 'transactions'}` : 'No transactions';
  const syncTiming = formatMoneyFreshness(account.lastSyncedAt).replace(/^Updated\s+/, '');
  const label = account.mask ? `${account.name} - ${account.mask}` : account.name;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${account.transactionCount > 0 ? 'Feeds meters' : 'Needs data'}`} onPress={onPress} style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}>
      <View style={styles.rowBody}>
        <View style={styles.accountGlyphColumn}><View style={styles.accountGlyph}><Icon name={account.type === 'credit' ? 'receipt' : 'landmark'} size={18} color={colors.pine700} /></View></View>
        <View style={styles.rowContent}>
          <Text numberOfLines={1} style={styles.rowTitle}>{label}</Text>
          <View style={styles.metadataLine}>
            <Text numberOfLines={1} style={styles.recentActivity}>{account.institutionName} - {transactionSummary}</Text>
            <View style={styles.syncTag}><Icon name="refresh" size={13} color={colors.textSecondary} /><Text numberOfLines={1} style={styles.syncTimingText}>{syncTiming}</Text></View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  accountList: { gap: 4 },
  actionGroup: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  iconButtonPressed: { backgroundColor: colors.fieldFillPressed },
  iconButtonDisabled: { opacity: 0.35 },
  freshnessRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingBottom: spacing.xs },
  freshnessText: { flexShrink: 0, ...typography.bodyXs, color: colors.textSecondary },
  activityCheckText: { flex: 1, ...typography.bodyXs, color: colors.textSecondary, textAlign: 'right' },
  row: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, backgroundColor: colors.card },
  rowPressed: { backgroundColor: colors.gray50 },
  accountGlyph: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pine50 },
  accountGlyphColumn: { alignSelf: 'stretch', justifyContent: 'center' },
  rowBody: { minWidth: 0, flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  rowContent: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 1 },
  rowTitle: { flex: 1, ...typography.bodySm, fontFamily: fonts.bold, color: colors.textPrimary },
  metadataLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  syncTag: { maxWidth: 102, minHeight: 24, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, borderRadius: 999, backgroundColor: colors.gray50 },
  syncTimingText: { flexShrink: 1, ...typography.bodyXs, color: colors.textSecondary, textAlign: 'right' },
  recentActivity: { flex: 1, ...typography.caption, color: colors.muted },
  emptyState: { gap: spacing.xs, padding: spacing.lg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, backgroundColor: colors.card },
  emptyTitle: { ...typography.bodySm, fontFamily: fonts.bold, color: colors.textPrimary },
  emptyCopy: { ...typography.bodyXs, color: colors.textSecondary },
});
