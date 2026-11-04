import React, { useEffect, useState } from 'react';
import { rootNavigationRef } from '../../../src/navigation/rootNavigationRef';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';
import { Urbanist_500Medium, Urbanist_700Bold, Urbanist_800ExtraBold, Urbanist_900Black } from '@expo-google-fonts/urbanist';
import { RootNavigator } from '../../../src/navigation/RootNavigator';
import { WorkflowFeedbackProvider, WorkflowFeedbackHost } from '../../../src/features/workflow-feedback';
import { FirstTimeUxFlow } from '../../../src/features/onboarding/FirstTimeUxFlow';
import { CelebrationInterstitialHost } from '../../../src/ui/CelebrationInterstitial';
import { PartnerProgressGuideHost } from '../../../src/ui/PartnerProgressGuide';
import { PortalHost } from '../../../src/ui/Portal';
import { useAppStore } from '../../../src/store/useAppStore';

// Local UI state only. No identity/session is forged and no backend is signed in.
useAppStore.setState({ hasCompletedFirstTimeOnboarding: true });

export function WorkspaceHarness() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const check = () => setReady(rootNavigationRef.isReady());
    const unsubscribe = rootNavigationRef.addListener('ready', check);
    check();
    return unsubscribe;
  }, []);
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
    Inter_700Bold, Inter_800ExtraBold, Inter_900Black, Urbanist_500Medium,
    Urbanist_700Bold, Urbanist_800ExtraBold, Urbanist_900Black });
  if (!loaded) return null;
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider>
    <BottomSheetModalProvider><WorkflowFeedbackProvider>
      <SafeAreaView edges={['top']}><Text>{ready ? 'Workspace native fixture' : 'Starting workspace fixture'}</Text></SafeAreaView>
      <View style={{ flex: 1 }}><RootNavigator /></View>
      <FirstTimeUxFlow />
      <CelebrationInterstitialHost />
      <PartnerProgressGuideHost />
      <WorkflowFeedbackHost />
      <PortalHost />
    </WorkflowFeedbackProvider></BottomSheetModalProvider>
  </SafeAreaProvider></GestureHandlerRootView>;
}
