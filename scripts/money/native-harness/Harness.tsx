import React from 'react';
import { Button, ScrollView, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';
import { PortalHost } from '../../../src/ui/Portal';
import type { MoneyStackParamList } from '../../../src/capabilities/money/navigation/types';
import { MoneyTransactionsScreen } from '../../../src/capabilities/money/screens/MoneyTransactionsScreen';
import { MoneyTransactionDetailScreen } from '../../../src/capabilities/money/screens/MoneyTransactionDetailScreen';
import { selectFixture, useMoneyData } from './fixture';

const Stack = createNativeStackNavigator<MoneyStackParamList>();
function FixturePicker({ navigation }: NativeStackScreenProps<MoneyStackParamList, 'MoneySummary'>) {
  const { refreshes } = useMoneyData();
  const open = (count: number, mode = 'ready', overageReview = false) => {
    selectFixture(count, mode);
    navigation.navigate('MoneyTransactions', { overageReview, flexibleRoomCents: -100000 });
  };
  return <SafeAreaView style={{ flex: 1 }}><ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
    <Text style={{ fontSize: 24 }}>Budget native fixture</Text>
    <Text>Synthetic data only. Backend disabled. Current screen code; development native host.</Text>
    <Text>Completed refreshes: {refreshes}</Text>
    {[0, 1000, 4000, 10000].map((count) => <Button key={count} title={`${count} transactions`} onPress={() => open(count)} />)}
    <Button title="Stale data and refresh" onPress={() => open(4000, 'stale')} />
    <Button title="Initial error and retry" onPress={() => open(0, 'error')} />
    <Button title="Initial loading" onPress={() => open(0, 'loading')} />
    <Button title="Overage review" onPress={() => open(4000, 'ready', true)} />
  </ScrollView></SafeAreaView>;
}
export function Harness() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black });
  if (!loaded) return null;
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider>
    <NavigationContainer><Stack.Navigator initialRouteName="MoneySummary" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoneySummary" component={FixturePicker} />
      <Stack.Screen name="MoneyTransactions" component={MoneyTransactionsScreen} />
      <Stack.Screen name="MoneyTransactionDetail" component={MoneyTransactionDetailScreen} />
    </Stack.Navigator></NavigationContainer><PortalHost />
  </SafeAreaProvider></GestureHandlerRootView>;
}
