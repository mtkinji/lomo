import { StyleSheet } from 'react-native';
import { EditorialOnboardingScreen } from '../../../features/capability-onboarding/EditorialOnboardingScreen';
import { Button } from '../../../ui/Button';
import { Text } from '../../../ui/Typography';
import { typography } from '../../../theme';
import { formatMoney } from '../data/moneySnapshot';
import type { MoneyFirstLook } from '../domain/moneyFirstLook';

export function MoneyFirstLookScreen({ finding, onContinue, onExplore, onInspect, active = true }: {
  finding: MoneyFirstLook | null;
  onContinue: () => void;
  onExplore: () => void;
  onInspect: () => void;
  active?: boolean;
}) {
  return (
    <EditorialOnboardingScreen
      active={active}
      eyebrow="Your first look"
      title={finding ? 'A clearer view of your spending.' : 'Start with what’s here.'}
      onExit={onExplore} exitLabel="Go to Money"
      action={<Button fullWidth size="lg" onPress={onContinue}>Continue to budget</Button>}
    >
      {finding ? <>
        <Text style={styles.amount}>{formatMoney(finding.amountCents, finding.currencyCode)}</Text>
        <Text variant="body">Across {finding.transactionIds.length} posted outgoing transactions in your connected accounts.</Text>
        <Text variant="bodySm">{finding.startDate} – {finding.endDate}. Loaded activity only, before refunds and credits. Pending charges and transfers aren’t included.</Text>
        <Button variant="outline" onPress={onInspect}>Review these transactions</Button>
      </> : <Text variant="body">There isn’t enough posted activity here for a spending summary yet. You can review your connected accounts or continue with setup.</Text>}
    </EditorialOnboardingScreen>
  );
}

const styles = StyleSheet.create({ amount: { ...typography.titleXl } });
