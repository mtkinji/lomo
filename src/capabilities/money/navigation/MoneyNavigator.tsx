import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MoneyAccountsScreen } from '../screens/MoneyAccountsScreen';
import { MoneyDetailPlaceholderScreen } from '../screens/MoneyDetailPlaceholderScreen';
import { MoneySummaryScreen } from '../screens/MoneySummaryScreen';
import { MoneyTransactionsScreen } from '../screens/MoneyTransactionsScreen';
import type { MoneyStackParamList } from './types';

const Stack = createNativeStackNavigator<MoneyStackParamList>();

export function MoneyNavigator() {
  return (
    <Stack.Navigator initialRouteName="MoneySummary" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoneySummary" component={MoneySummaryScreen} />
      <Stack.Screen name="MoneyTransactions" component={MoneyTransactionsScreen} />
      <Stack.Screen name="MoneyAccounts" component={MoneyAccountsScreen} />
      <Stack.Screen name="MoneyCategoryDetail" component={MoneyDetailPlaceholderScreen} />
      <Stack.Screen name="MoneyTransactionDetail" component={MoneyDetailPlaceholderScreen} />
    </Stack.Navigator>
  );
}
