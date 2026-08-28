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
import { MoneyAppControlBudgetPickerScreen } from '../screens/MoneyAppControlBudgetPickerScreen';
import { MoneyLivingPlanScreen } from '../screens/MoneyLivingPlanScreen';
import { MoneyLivingPlanReceiptScreen } from '../screens/MoneyLivingPlanReceiptScreen';
import { MoneySetupScreen } from '../screens/MoneySetupScreen';
import { MoneyEntryScreen } from '../screens/MoneyEntryScreen';
import { useAppStore } from '../../../store/useAppStore';
import { getMoneyPlaceScreenOptions } from './moneyNavigationOptions';

const Stack = createNativeStackNavigator<MoneyStackParamList>();

export function MoneyNavigator() {
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  return (
    <MoneyPrivacyGate>
      <MoneyDataProvider key={userId ?? 'signed-out'} userId={userId}>
        <Stack.Navigator initialRouteName="MoneySummary" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MoneyEntry" component={MoneyEntryScreen} />
          <Stack.Screen
            name="MoneySummary"
            component={MoneySummaryScreen}
            options={({ route }) => getMoneyPlaceScreenOptions(route.params)}
          />
          <Stack.Screen
            name="MoneyTransactions"
            component={MoneyTransactionsScreen}
            options={({ route }) => getMoneyPlaceScreenOptions(route.params)}
          />
          <Stack.Screen
            name="MoneyAccounts"
            component={MoneyAccountsScreen}
            options={({ route }) => getMoneyPlaceScreenOptions(route.params)}
          />
          <Stack.Screen name="MoneyCategoryDetail" component={MoneyCategoryDetailScreen} />
          <Stack.Screen name="MoneyCategoryCreate" component={MoneyCategoryCreateScreen} />
          <Stack.Screen name="MoneySetup" component={MoneySetupScreen} />
          <Stack.Screen name="MoneyAppControl" component={MoneyAppControlScreen} />
          <Stack.Screen name="MoneyAppControlBudgetPicker" component={MoneyAppControlBudgetPickerScreen} />
          <Stack.Screen name="MoneyLivingPlan" component={MoneyLivingPlanScreen} />
          <Stack.Screen name="MoneyLivingPlanReceipt" component={MoneyLivingPlanReceiptScreen} />
          <Stack.Screen name="MoneyTransactionDetail" component={MoneyTransactionDetailScreen} />
        </Stack.Navigator>
      </MoneyDataProvider>
    </MoneyPrivacyGate>
  );
}
