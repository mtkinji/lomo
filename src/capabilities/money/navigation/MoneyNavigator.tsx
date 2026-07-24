import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MoneyDataProvider } from '../data/MoneyDataContext';
import { MoneyAccountsScreen } from '../screens/MoneyAccountsScreen';
import { MoneyDetailScreen } from '../screens/MoneyDetailScreen';
import { MoneySummaryScreen } from '../screens/MoneySummaryScreen';
import { MoneyTransactionsScreen } from '../screens/MoneyTransactionsScreen';
import type { MoneyStackParamList } from './types';

const Stack = createNativeStackNavigator<MoneyStackParamList>();

export function MoneyNavigator() {
  return (
    <MoneyDataProvider>
      <Stack.Navigator initialRouteName="MoneySummary" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MoneySummary" component={MoneySummaryScreen} />
        <Stack.Screen name="MoneyTransactions" component={MoneyTransactionsScreen} />
        <Stack.Screen name="MoneyAccounts" component={MoneyAccountsScreen} />
        <Stack.Screen name="MoneyCategoryDetail" component={MoneyDetailScreen} />
        <Stack.Screen name="MoneyTransactionDetail" component={MoneyDetailScreen} />
      </Stack.Navigator>
    </MoneyDataProvider>
  );
}
