import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Heading, Text } from '../../../ui/Typography';
import { useMoneyData } from '../data/MoneyDataContext';
import { syncMoneyTransactions } from '../data/moneyPlaidApi';
import { formatMoneyFreshness } from '../data/moneySnapshot';
import { startMoneyPlaidLink } from '../native/moneyPlaidLink';
import type { MoneyStackParamList } from '../navigation/types';
import type { MoneyPlaceRouteName } from '../navigation/types';
import { MoneyScreenFrame } from './MoneyScreenFrame';

export function MoneyAccountsScreen({ navigation }: NativeStackScreenProps<MoneyStackParamList, 'MoneyAccounts'>) {
  const { snapshot, refresh } = useMoneyData();
  const [connectionAction, setConnectionAction] = useState<'linking' | 'syncing' | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);

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
    setConnectionMessage('Syncing connected accounts…');
    try {
      const result = await syncMoneyTransactions(getSupabaseClient());
      await refresh();
      setConnectionMessage(result.added > 0 ? `${result.added} new ${result.added === 1 ? 'transaction' : 'transactions'} arrived.` : 'Accounts are up to date.');
    } catch (error) {
      setConnectionMessage(error instanceof Error ? error.message : 'Connected accounts could not sync.');
    } finally {
      setConnectionAction(null);
    }
  };

  return (
    <MoneyScreenFrame
      activePlace="MoneyAccounts"
      onSelectPlace={(place) => (navigation.navigate as (route: MoneyPlaceRouteName) => void)(place)}
      title="Accounts"
    >
      <View style={styles.actions}>
        <Button disabled={Boolean(connectionAction)} fullWidth onPress={() => void connectAccount()} variant="primary">
          {connectionAction === 'linking' ? 'Connecting…' : snapshot?.accounts.length ? 'Connect another account' : 'Connect account'}
        </Button>
        {snapshot?.accounts.length ? (
          <Button disabled={Boolean(connectionAction)} fullWidth onPress={() => void syncAccounts()} variant="outline">
            {connectionAction === 'syncing' ? 'Syncing…' : 'Sync now'}
          </Button>
        ) : null}
        {connectionMessage ? <Text tone="secondary">{connectionMessage}</Text> : null}
      </View>
      {snapshot?.accounts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Heading variant="sm">No connected accounts</Heading>
          <Text tone="secondary">Connect through Plaid to bring account and transaction activity into Money.</Text>
        </View>
      ) : snapshot?.accounts.map((account) => (
        <Pressable
          key={account.id}
          accessibilityRole="button"
          onPress={() => navigation.navigate('MoneyTransactions', { accountId: account.id })}
          style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
        >
          <View style={styles.flex}>
            <Heading variant="sm" numberOfLines={1}>{account.name}</Heading>
            <Text tone="secondary">{account.institutionName}{account.mask ? ` · •••• ${account.mask}` : ''}</Text>
            <Text tone="muted">{formatMoneyFreshness(account.lastSyncedAt)}</Text>
          </View>
          <View style={styles.trailing}>
            <Text variant="label">{account.transactionCount}</Text>
            <Text tone="secondary">transactions</Text>
          </View>
        </Pressable>
      ))}
    </MoneyScreenFrame>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  emptyCard: {
    gap: spacing.xs, padding: spacing.lg, borderRadius: 16,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
    borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  flex: { flex: 1, gap: 2 },
  trailing: { alignItems: 'flex-end' },
  pressed: { opacity: 0.72 },
});
