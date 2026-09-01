import { Pressable } from '@/src/ui/HapticPressable';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState, type ReactNode } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { SettingsStackParamList } from '../../../navigation/RootNavigator';
import { rootNavigationRef } from '../../../navigation/rootNavigationRef';
import { useAppStore } from '../../../store/useAppStore';
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
import { MoneyDataProvider, useMoneyData } from '../data/MoneyDataContext';
import { isMoneyPlaidError } from '../data/moneyPlaidErrors';
import { formatMoneyFreshness, type MoneyAccount, type MoneyConnection } from '../data/moneySnapshot';
import { signalMoneyChoice, signalMoneyMutationOutcome } from '../runtime/moneyMutationFeedback';
import { connectMoneyAccount } from '../runtime/connectMoneyAccount';
import { MoneyPrivacyGate } from '../runtime/MoneyPrivacyGate';
import type { MoneyStackParamList } from '../navigation/types';
import { MoneyScreenFrame } from './MoneyScreenFrame';
import { EmptyState } from '../../../ui/EmptyState';
import { startMoneyPlaidLink, startMoneyPlaidRepair } from '../native/moneyPlaidLink';
import { requestMoneyProAccess } from '../runtime/moneyProAccess';

type AccountFilter = 'all' | 'linked' | 'needs_review';
type AccountSort = 'name' | 'transactions_high' | 'status';
type ConnectionTone = 'neutral' | 'success' | 'error';

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
  return (
    <MoneyAccountsSurface
      onOpenTransactions={(accountId) => navigation.navigate('MoneyTransactions', { accountId })}
    />
  );
}

export function SettingsMoneyAccountsScreen({ navigation }: NativeStackScreenProps<SettingsStackParamList, 'SettingsMoneyAccounts'>) {
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  return (
    <MoneyPrivacyGate>
      <MoneyDataProvider key={userId ?? 'signed-out'} userId={userId}>
        <MoneyAccountsSurface
          onPressBack={() => navigation.goBack()}
          onOpenTransactions={(accountId) => rootNavigationRef.navigate('Money', {
            screen: 'MoneyTransactions',
            params: { accountId },
          })}
        />
      </MoneyDataProvider>
    </MoneyPrivacyGate>
  );
}

export function MoneyAccountsSurface({
  onOpenTransactions,
  onPressBack,
}: {
  onOpenTransactions: (accountId: string) => void;
  onPressBack?: () => void;
}) {
  const { snapshot, reconcileConnectedActivity, disconnectConnection } = useMoneyData();
  const [filter, setFilter] = useState<AccountFilter>('all');
  const [sort, setSort] = useState<AccountSort>('name');
  const [connectionAction, setConnectionAction] = useState<'linking' | 'syncing' | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [connectionTone, setConnectionTone] = useState<ConnectionTone>('neutral');
  const [canRetryConnection, setCanRetryConnection] = useState(false);
  const accounts = snapshot?.accounts ?? [];
  const connections = (snapshot?.connections ?? []).filter((connection) => connection.status !== 'disconnected');
  const sampleDataVisible = connections.length > 0
    && connections.every((connection) => connection.environment === 'sandbox');
  const visibleAccounts = useMemo(() => sortAccounts(accounts.filter((account) => (
    filter === 'all' || (filter === 'linked' ? account.transactionCount > 0 : account.transactionCount === 0)
  )), sort), [accounts, filter, sort]);

  const connectAccount = async () => {
    if (connectionAction) return;
    if (!requestMoneyProAccess('money_connect_account')) return;
    signalMoneyChoice();
    setConnectionAction('linking');
    setConnectionTone('neutral');
    setCanRetryConnection(false);
    setConnectionMessage('Opening a secure Plaid connection…');
    const result = await connectMoneyAccount({ startLink: startMoneyPlaidLink, reconcileConnectedActivity });
    if (result.status === 'cancelled') {
      setConnectionMessage('Account connection closed without changes.');
    } else if (result.status === 'connected') {
      setConnectionTone('success');
      setConnectionMessage(`${result.institutionName} connected and synced.`);
      signalMoneyMutationOutcome('succeeded');
    } else {
      setConnectionTone('error');
      setCanRetryConnection(true);
      setConnectionMessage(result.message);
      signalMoneyMutationOutcome('failed');
    }
    setConnectionAction(null);
  };

  const syncAccounts = async () => {
    if (connectionAction) return;
    if (!requestMoneyProAccess('money_sync')) return;
    signalMoneyChoice();
    setConnectionAction('syncing');
    setConnectionTone('neutral');
    setCanRetryConnection(false);
    setConnectionMessage('Checking…');
    try {
      const result = await reconcileConnectedActivity({ trigger: 'manual_sync', sync: true });
      const added = result?.added ?? 0;
      setConnectionTone('success');
      setConnectionMessage(added > 0 ? `${added} new ${added === 1 ? 'transaction' : 'transactions'}` : 'Accounts are up to date');
      signalMoneyMutationOutcome('succeeded');
    } catch (error) {
      setConnectionTone('error');
      setConnectionMessage(isMoneyPlaidError(error) ? error.message : 'Kwilt could not check the accounts. Try again.');
      signalMoneyMutationOutcome('failed');
    } finally {
      setConnectionAction(null);
    }
  };

  const repairConnection = async (connection: MoneyConnection) => {
    if (connectionAction) return;
    if (!requestMoneyProAccess('money_connect_account')) return;
    signalMoneyChoice();
    setConnectionAction('linking');
    setConnectionTone('neutral');
    setConnectionMessage(`Opening secure repair for ${connection.institutionName}…`);
    try {
      const result = await startMoneyPlaidRepair(connection.id);
      if (result.status === 'cancelled') {
        setConnectionMessage('Connection repair closed without changes.');
      } else {
        await reconcileConnectedActivity({ trigger: 'manual_sync', sync: true });
        setConnectionTone('success');
        setConnectionMessage(`${connection.institutionName} repaired and checked.`);
        signalMoneyMutationOutcome('succeeded');
      }
    } catch (error) {
      setConnectionTone('error');
      setConnectionMessage(isMoneyPlaidError(error) ? error.message : 'Kwilt could not repair this connection. Try again.');
      signalMoneyMutationOutcome('failed');
    } finally {
      setConnectionAction(null);
    }
  };

  const confirmDisconnect = (connection: MoneyConnection) => {
    if (connectionAction) return;
    Alert.alert(
      `Disconnect ${connection.institutionName}?`,
      `${connection.accountCount} linked account${connection.accountCount === 1 ? '' : 's'} will stop syncing. Existing Money history stays in Kwilt.`,
      [
        { text: 'Keep connected', style: 'cancel' },
        {
          text: 'Disconnect', style: 'destructive',
          onPress: () => {
            setConnectionAction('syncing');
            setConnectionTone('neutral');
            setConnectionMessage(`Disconnecting ${connection.institutionName}…`);
            void disconnectConnection(connection.id).then(() => {
              setConnectionTone('success');
              setConnectionMessage(`${connection.institutionName} disconnected.`);
              signalMoneyMutationOutcome('succeeded');
            }).catch((error) => {
              setConnectionTone('error');
              setConnectionMessage(error instanceof Error ? error.message : 'The provider did not confirm the disconnect.');
              signalMoneyMutationOutcome('failed');
            }).finally(() => setConnectionAction(null));
          },
        },
      ],
    );
  };

  return (
    <MoneyScreenFrame
      title="Accounts"
      onPressBack={onPressBack}
    >
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
        action={sampleDataVisible ? null : (
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
          {sampleDataVisible ? <Text style={styles.sampleDataLabel}>Sample Plaid data</Text> : null}
        </View>
        {connectionMessage ? (
          <View accessibilityLiveRegion="polite" style={[styles.connectionStatus, connectionTone === 'error' ? styles.connectionStatusError : null]}>
            <Icon name={connectionTone === 'error' ? 'warning' : connectionTone === 'success' ? 'check' : 'refresh'} size={15} color={connectionTone === 'error' ? colors.madder700 : colors.textSecondary} />
            <Text style={[styles.connectionStatusText, connectionTone === 'error' ? styles.connectionStatusTextError : null]}>{connectionMessage}</Text>
            {canRetryConnection && !connectionAction ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Try connecting the account again" hitSlop={8} onPress={() => void connectAccount()} style={({ pressed }) => [styles.retryButton, pressed ? styles.retryButtonPressed : null]}>
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {connections.length > 0 ? (
          <View style={styles.connectionGroup}>
            <Text style={styles.connectionHeading}>Connections</Text>
            {connections.map((connection) => (
              <ConnectionInventoryRow
                key={connection.id}
                connection={connection}
                disabled={Boolean(connectionAction)}
                onRepair={() => void repairConnection(connection)}
                onDisconnect={() => confirmDisconnect(connection)}
              />
            ))}
          </View>
        ) : null}
        {visibleAccounts.length > 0 ? visibleAccounts.map((account) => (
          <AccountInventoryRow key={account.id} account={account} onPress={() => onOpenTransactions(account.id)} />
        )) : accounts.length === 0 ? (
          <EmptyState
            illustration={null}
            title="Connect your first account"
            instructions="Accounts give Kwilt the real income and spending needed to keep Money useful."
            primaryAction={{
              label: connectionAction ? 'Connecting…' : 'Connect an account',
              disabled: Boolean(connectionAction),
              onPress: () => void connectAccount(),
            }}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No accounts in this view</Text>
            <Text style={styles.emptyCopy}>Adjust the filter to review the rest of the account inventory.</Text>
          </View>
        )}
      </MoneyInventoryListFrame>
    </MoneyScreenFrame>
  );
}

function ConnectionInventoryRow({ connection, disabled, onRepair, onDisconnect }: {
  connection: MoneyConnection; disabled: boolean; onRepair: () => void; onDisconnect: () => void;
}) {
  const needsRepair = connection.status === 'error';
  return (
    <View style={styles.connectionRow}>
      <View style={styles.connectionRowCopy}>
        <Text numberOfLines={1} style={styles.rowTitle}>{connection.institutionName}</Text>
        <Text style={styles.recentActivity}>
          {connection.environment === 'sandbox'
            ? `${connection.accountCount} sample account${connection.accountCount === 1 ? '' : 's'}`
            : needsRepair ? 'Needs repair' : `${connection.accountCount} linked account${connection.accountCount === 1 ? '' : 's'}`}
        </Text>
      </View>
      {connection.environment === 'sandbox' ? null : <DropdownMenu>
        <DropdownMenuTrigger accessibilityLabel={`Manage ${connection.institutionName} connection`} disabled={disabled}>
          <View pointerEvents="none" style={[styles.connectionMenuButton, disabled ? styles.iconButtonDisabled : null]}>
            <Icon name="more" size={18} color={colors.textPrimary} />
          </View>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" sideOffset={6} align="end">
          <DropdownMenuItem onPress={onRepair} accessibilityLabel={`Repair ${connection.institutionName} connection`}>
            <View style={menuStyles.menuItemRow}>
              <Icon name="refresh" size={18} color={colors.textSecondary} />
              <Text style={menuStyles.menuItemText} {...menuItemTextProps}>Repair connection</Text>
            </View>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onPress={onDisconnect} accessibilityLabel={`Disconnect ${connection.institutionName}`}>
            <View style={menuStyles.menuItemRow}>
              <Icon name="link" size={18} color={colors.madder700} />
              <Text style={[menuStyles.menuItemText, styles.destructiveMenuText]} {...menuItemTextProps}>Disconnect</Text>
            </View>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>}
    </View>
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
  sampleDataLabel: { ...typography.bodyXs, color: colors.textSecondary, fontFamily: fonts.bold },
  connectionStatus: { minHeight: 38, marginBottom: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: 8, backgroundColor: colors.gray50 },
  connectionStatusError: { backgroundColor: colors.madder50 },
  connectionStatusText: { flex: 1, ...typography.bodyXs, color: colors.textSecondary },
  connectionStatusTextError: { color: colors.madder800 },
  connectionGroup: { gap: spacing.xs, paddingBottom: spacing.sm },
  connectionHeading: { ...typography.bodyXs, fontFamily: fonts.bold, color: colors.textSecondary },
  connectionRow: { minHeight: 54, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, backgroundColor: colors.card },
  connectionRowCopy: { flex: 1, minWidth: 0, gap: 2 },
  connectionMenuButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  destructiveMenuText: { color: colors.madder700 },
  retryButton: { minHeight: 32, justifyContent: 'center', paddingHorizontal: spacing.xs, borderRadius: 6 },
  retryButtonPressed: { backgroundColor: colors.madder100 },
  retryButtonText: { ...typography.bodyXs, fontFamily: fonts.bold, color: colors.madder800 },
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
