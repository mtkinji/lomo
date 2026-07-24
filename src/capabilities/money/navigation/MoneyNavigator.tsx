import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MoneyDataProvider } from '../data/MoneyDataContext';
import { MoneyAccountsScreen } from '../screens/MoneyAccountsScreen';
import { MoneyCategoryCreateScreen } from '../screens/MoneyCategoryCreateScreen';
import { MoneyDetailScreen } from '../screens/MoneyDetailScreen';
import { MoneySummaryScreen } from '../screens/MoneySummaryScreen';
import { MoneyTransactionsScreen } from '../screens/MoneyTransactionsScreen';
import type { MoneyStackParamList } from './types';
import { MoneyPrivacyGate } from '../runtime/MoneyPrivacyGate';
import { MoneyAppControlScreen } from '../screens/MoneyAppControlScreen';

const Stack = createNativeStackNavigator<MoneyStackParamList>();

export function MoneyNavigator() {
  return (
    <MoneyPrivacyGate>
      <MoneyDataProvider>
        <Stack.Navigator initialRouteName="MoneySummary" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MoneySummary" component={MoneySummaryScreen} />
          <Stack.Screen name="MoneyTransactions" component={MoneyTransactionsScreen} />
          <Stack.Screen name="MoneyAccounts" component={MoneyAccountsScreen} />
          <Stack.Screen name="MoneyCategoryDetail" component={MoneyDetailScreen} />
          <Stack.Screen name="MoneyCategoryCreate" component={MoneyCategoryCreateScreen} />
          <Stack.Screen name="MoneyAppControl" component={MoneyAppControlScreen} />
          <Stack.Screen name="MoneyTransactionDetail" component={MoneyDetailScreen} />
        </Stack.Navigator>
      </MoneyDataProvider>
    </MoneyPrivacyGate>
  );
}
