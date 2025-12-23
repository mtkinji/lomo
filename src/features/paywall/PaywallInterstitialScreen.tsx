import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { PaywallDrawerScreenFallback } from './PaywallDrawer';

type ScreenRouteProp = RouteProp<SettingsStackParamList, 'SettingsPaywall'>;
type ScreenNavProp = NativeStackNavigationProp<SettingsStackParamList, 'SettingsPaywall'>;

export function PaywallInterstitialScreen() {
  const navigation = useNavigation<ScreenNavProp>();
  const route = useRoute<ScreenRouteProp>();
  const { reason, source } = route.params;

  useEffect(() => {
    // If this screen was reached via navigation, show the same full-height drawer.
    // Close should pop the Settings stack screen.
  }, [reason, source]);

  return (
    <View style={styles.screen}>
      <PaywallDrawerScreenFallback
        reason={reason}
        source={source}
        onClose={() => navigation.goBack()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});