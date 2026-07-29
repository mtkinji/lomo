import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthScreen } from '../features/auth/AuthScreen';
import { ConnectionGameScreen } from '../features/connection-games/ConnectionGameScreen';
import { GameShelfScreen } from '../features/home/GameShelfScreen';
import { JoinTableScreen } from '../features/remote/JoinTableScreen';
import { RemoteGameScreen } from '../features/remote/RemoteGameScreen';
import { TumbleScreen } from '../features/tumble/TumbleScreen';
import { AuthProvider } from '../shell/AuthProvider';
import type { GamesStackParamList } from './types';

const Stack = createNativeStackNavigator<GamesStackParamList>();

export function GamesNavigator() {
  return (
    <AuthProvider>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="GamesShelf" component={GameShelfScreen} />
        <Stack.Screen name="GamesTumble" component={TumbleScreen} />
        <Stack.Screen name="GamesConnection" component={ConnectionGameScreen} />
        <Stack.Screen name="GamesJoin" component={JoinTableScreen} />
        <Stack.Screen name="GamesRemote" component={RemoteGameScreen} />
        <Stack.Screen name="GamesAccount" component={AuthScreen} />
      </Stack.Navigator>
    </AuthProvider>
  );
}
