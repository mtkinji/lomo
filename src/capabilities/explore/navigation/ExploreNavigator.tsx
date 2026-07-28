import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExploreMapScreen } from '../screens/ExploreMapScreen';
import type { ExploreStackParamList } from './types';

const Stack = createNativeStackNavigator<ExploreStackParamList>();

export function ExploreNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExploreMap" component={ExploreMapScreen} />
    </Stack.Navigator>
  );
}
