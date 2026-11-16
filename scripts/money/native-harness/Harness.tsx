import React, { useEffect, useState } from 'react';
import { Button, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef, type NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';
import { PortalHost } from '../../../src/ui/Portal';
import type { MoneyStackParamList } from '../../../src/capabilities/money/navigation/types';
import { MoneyTransactionsScreen } from '../../../src/capabilities/money/screens/MoneyTransactionsScreen';
import { MoneyTransactionDetailScreen } from '../../../src/capabilities/money/screens/MoneyTransactionDetailScreen';
import { MoneyCategoryDetailScreen } from '../../../src/capabilities/money/screens/MoneyCategoryDetailScreen';
import { MoneyAccountsScreen } from '../../../src/capabilities/money/screens/MoneyAccountsScreen';
import { MoneySummaryScreen } from '../../../src/capabilities/money/screens/MoneySummaryScreen';
import { MoneyEntryScreen } from '../../../src/capabilities/money/screens/MoneyEntryScreen';
import { CapabilityShellProvider } from '../../../src/navigation/CapabilityShellContext';
import { CapabilityMenuStateProvider, useCapabilityMenuState } from '../../../src/navigation/CapabilityMenuStateContext';
import { CapabilitySideSheet } from '../../../src/navigation/CapabilitySideSheet';
import { CapabilityMenu } from '../../../src/navigation/CapabilityMenu';
import { createCapabilityMenuNavigationHandlers } from '../../../src/navigation/capabilityNavigation';
import { settingsFault } from './settings';
import { selectFixture, selectSettingsFixture, selectRuleFixture, useMoneyData } from './fixture';

const Stack = createNativeStackNavigator<MoneyStackParamList>();
type FixtureRoutes = { Fixtures: undefined; Money: NavigatorScreenParams<MoneyStackParamList> };
const Root = createNativeStackNavigator<FixtureRoutes>();
const navigationRef = createNavigationContainerRef<FixtureRoutes>();
function FixturePicker({ navigation }: NativeStackScreenProps<FixtureRoutes, 'Fixtures'>) {
  const dimensions = useWindowDimensions();
  useEffect(() => { console.info('[Budget fixture] dimensions', dimensions); }, [dimensions]);
  const [fixtureMessage, setFixtureMessage] = useState('');
  const rule = async (kind: 'partial' | 'transfer') => {
    try { const transactionId = await selectRuleFixture(kind); navigation.navigate('Money', { screen: 'MoneyTransactionDetail', params: { transactionId } }); }
    catch (error) { setFixtureMessage(error instanceof Error ? error.message : 'Fixture could not open'); }
  };
  const settings = async () => {
    try { const categoryId = await selectSettingsFixture(); navigation.navigate('Money', { screen: 'MoneyCategoryDetail', params: { categoryId } }); }
    catch (error) { setFixtureMessage(error instanceof Error ? error.message : 'Fixture could not open'); }
  };
  const fault = async (action: 'lose-response' | 'recover') => {
    try { await settingsFault(action); setFixtureMessage(action === 'recover' ? 'Receipt network restored' : 'Next save commits but its response and receipt lookup will be lost'); }
    catch { setFixtureMessage('Start the isolated Budget API fixture first'); }
  };
  const { refreshes } = useMoneyData();
  const open = (count: number, mode = 'ready', overageReview = false) => {
    selectFixture(count, mode);
    navigation.navigate('Money', { screen: 'MoneyTransactions', params: { overageReview, flexibleRoomCents: -100000 } });
  };
  return <SafeAreaView style={{ flex: 1 }}><ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
    <Text style={{ fontSize: 24 }}>Budget native fixture</Text>
    <Text>Synthetic data only. Production backend disabled. Settings and rules use isolated local PostgreSQL; other writes remain disabled.</Text>
    <Text>Completed refreshes: {refreshes}</Text>
    <Text accessibilityLiveRegion="polite">{fixtureMessage}</Text>
    <Button title="Budget and Accounts navigation" onPress={() => { selectFixture(4000); navigation.navigate('Money', { screen: 'MoneySummary' }); }} />
    <Button title="Category settings — isolated API" onPress={() => void settings()} />
    <Button title="Lose next save response" onPress={() => void fault('lose-response')} />
    <Button title="Restore receipt network" onPress={() => void fault('recover')} />
    <Button title="Partial rule — isolated API" onPress={() => void rule('partial')} />
    <Button title="Transfer rule — isolated API" onPress={() => void rule('transfer')} />
    {[0, 1000, 4000, 10000].map((count) => <Button key={count} title={`${count} transactions`} onPress={() => open(count)} />)}
    <Button title="Stale data and refresh" onPress={() => open(4000, 'stale')} />
    <Button title="Initial error and retry" onPress={() => open(0, 'error')} />
    <Button title="Initial loading" onPress={() => open(0, 'loading')} />
    <Button title="Overage review" onPress={() => open(4000, 'ready', true)} />
  </ScrollView></SafeAreaView>;
}
// Real screen/menu/entry routing with fixture data. The entry screen's automatic
// fallback is exercised because external identity is deliberately unavailable.
function MoneyScreens() {
  return <CapabilityShellProvider><Stack.Navigator initialRouteName="MoneySummary" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MoneySummary" component={MoneySummaryScreen} />
    <Stack.Screen name="MoneyEntry" component={MoneyEntryScreen} />
    <Stack.Screen name="MoneyAccounts" component={MoneyAccountsScreen} />
    <Stack.Screen name="MoneyCategoryDetail" component={MoneyCategoryDetailScreen} />
    <Stack.Screen name="MoneyTransactions" component={MoneyTransactionsScreen} />
    <Stack.Screen name="MoneyTransactionDetail" component={MoneyTransactionDetailScreen} />
  </Stack.Navigator></CapabilityShellProvider>;
}
function FixtureMenu({ activeRouteName }: { activeRouteName?: string }) {
  const { menuOpen, coverMenu } = useCapabilityMenuState();
  const handlers = createCapabilityMenuNavigationHandlers({
    activeRouteName, dispatch: (action) => navigationRef.dispatch(action), coverMenu,
    captureSelection: (id) => console.info('[Budget fixture] menu selection', id),
  });
  const unavailable = () => { throw new Error('Unrelated action disabled in Budget native fixture'); };
  return <CapabilityMenu menuOpen={menuOpen} activeCapabilityId="money-summary" chats={[]}
    displayName="Synthetic fixture" {...handlers}
    onSetCapabilityPinned={unavailable} onSelectChat={unavailable} onArchiveChat={unavailable}
    onDeleteChat={unavailable} onDeleteChats={async () => false} onCreateChat={unavailable}
    onOpenSearch={unavailable} onOpenSettings={unavailable} onOpenChat={unavailable} />;
}
function FixtureControls() {
  const { openMenu, coverMenu } = useCapabilityMenuState();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 20 }}>
    <Button title="Fixture menu" onPress={openMenu} />
    <Button title="Choose fixture" onPress={() => { coverMenu(); navigationRef.navigate('Fixtures'); }} />
  </View>;
}
export function Harness() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black });
  const [activeRouteName, setActiveRouteName] = useState<string>();
  if (!loaded) return null;
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider>
    <NavigationContainer ref={navigationRef} onStateChange={() => {
      const name = navigationRef.getCurrentRoute()?.name;
      setActiveRouteName(name);
      console.info('[Budget fixture] route', name);
    }}><CapabilityMenuStateProvider>
      <CapabilitySideSheet menu={<FixtureMenu activeRouteName={activeRouteName} />}>
        <Root.Navigator initialRouteName="Fixtures" screenOptions={{ headerShown: false }}>
          <Root.Screen name="Fixtures" component={FixturePicker} />
          <Root.Screen name="Money" component={MoneyScreens} />
        </Root.Navigator>
        <FixtureControls />
      </CapabilitySideSheet>
    </CapabilityMenuStateProvider></NavigationContainer><PortalHost />
  </SafeAreaProvider></GestureHandlerRootView>;
}
