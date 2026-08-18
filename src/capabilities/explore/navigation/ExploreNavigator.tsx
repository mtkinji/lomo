import { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { ExploreMapScreen } from '../screens/ExploreMapScreen';
import { useExploreStore } from '../runtime/useExploreStore';
import type { ExploreStackParamList } from './types';
import { colors } from '../../../theme';
import { KwiltLoader } from '../../../ui/KwiltLoader';

const Stack = createNativeStackNavigator<ExploreStackParamList>();

export function ExploreNavigator() {
  const [hydrated, setHydrated] = useState(() => useExploreStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    let active = true;
    void Promise.resolve(useExploreStore.persist.rehydrate()).finally(() => {
      if (active) setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, [hydrated]);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <KwiltLoader size="large" accessibilityLabel="Loading Explore" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExploreMap" component={ExploreMapScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
});
