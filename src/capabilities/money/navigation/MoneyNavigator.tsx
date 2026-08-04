import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MoneyDataProvider } from '../data/MoneyDataContext';
import { MoneyAccountsScreen } from '../screens/MoneyAccountsScreen';
import { MoneyCategoryDetailScreen } from '../screens/MoneyCategoryDetailScreen';
import { MoneyCategoryCreateScreen } from '../screens/MoneyCategoryCreateScreen';
import { MoneySummaryScreen } from '../screens/MoneySummaryScreen';
import { MoneyTransactionsScreen } from '../screens/MoneyTransactionsScreen';
import { MoneyTransactionDetailScreen } from '../screens/MoneyTransactionDetailScreen';
import type { MoneyStackParamList } from './types';
import { MoneyPrivacyGate } from '../runtime/MoneyPrivacyGate';
import { MoneyAppControlScreen } from '../screens/MoneyAppControlScreen';
import { MoneyLivingPlanScreen } from '../screens/MoneyLivingPlanScreen';
import { MoneyLivingPlanReceiptScreen } from '../screens/MoneyLivingPlanReceiptScreen';
import { MoneySetupScreen } from '../screens/MoneySetupScreen';
import { useAppStore } from '../../../store/useAppStore';

const Stack = createNativeStackNavigator<MoneyStackParamList>();

export function MoneyNavigator() {
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  return (
    <MoneyPrivacyGate>
      <MoneyDataProvider key={userId ?? 'signed-out'} userId={userId}>
        <Stack.Navigator initialRouteName="MoneySummary" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MoneySummary" component={MoneySummaryScreen} />
          <Stack.Screen name="MoneyTransactions" component={MoneyTransactionsScreen} />
          <Stack.Screen name="MoneyAccounts" component={MoneyAccountsScreen} />
          <Stack.Screen name="MoneyCategoryDetail" component={MoneyCategoryDetailScreen} />
          <Stack.Screen name="MoneyCategoryCreate" component={MoneyCategoryCreateScreen} />
          <Stack.Screen name="MoneySetup" component={MoneySetupScreen} />
          <Stack.Screen name="MoneyAppControl" component={MoneyAppControlScreen} />
          <Stack.Screen name="MoneyLivingPlan" component={MoneyLivingPlanScreen} />
          <Stack.Screen name="MoneyLivingPlanReceipt" component={MoneyLivingPlanReceiptScreen} />
          <Stack.Screen name="MoneyTransactionDetail" component={MoneyTransactionDetailScreen} />
        </Stack.Navigator>
      </MoneyDataProvider>
    </MoneyPrivacyGate>
  );
}
