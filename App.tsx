import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PortalHost } from '@rn-primitives/portal';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { Poppins_700Bold } from '@expo-google-fonts/poppins';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';
import { FirstTimeUxFlow } from './src/features/onboarding/FirstTimeUxFlow';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.shell }}>
      <SafeAreaProvider>
          <GluestackUIProvider config={config}>
            <BottomSheetModalProvider>
              <StatusBar style="dark" />
              <RootNavigator />
              <FirstTimeUxFlow />
              <PortalHost />
            </BottomSheetModalProvider>
          </GluestackUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

