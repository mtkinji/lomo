import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthScreen } from '../features/auth/AuthScreen';
import { ConnectionGameScreen } from '../features/connection-games/ConnectionGameScreen';
import { GameShelfScreen } from '../features/home/GameShelfScreen';
import { JoinTableScreen } from '../features/remote/JoinTableScreen';
import { RemoteGameScreen } from '../features/remote/RemoteGameScreen';
import { TumbleScreen } from '../features/tumble/TumbleScreen';
import { GameTimerScreen } from '../features/timer/GameTimerScreen';
import { StitchFiveScreen } from '../features/stitch-five/StitchFiveScreen';
import { AuthProvider } from '../shell/AuthProvider';
import type { GamesStackParamList } from './types';
import { REMOTE_GAMES_RELEASE_ENABLED } from '../remote/remoteGamesReleasePolicy';
import { ConnectionGameFrame, PlayCard } from '../features/connection-games/ConnectionGameFrame';
import { Text } from 'react-native';
import { gamesTheme } from '../theme/gamesTheme';

const Stack = createNativeStackNavigator<GamesStackParamList>();

function RemoteGamesUnavailableScreen() {
  return <ConnectionGameFrame title="Remote play unavailable" promise="Local games are still ready at your table.">
    <PlayCard tone="paper"><Text style={{ fontFamily: gamesTheme.type.body, color: gamesTheme.colors.ink }}>Remote rooms are not included in this release.</Text></PlayCard>
  </ConnectionGameFrame>;
}

export function GamesNavigator() {
  return (
    <AuthProvider>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="GamesShelf" component={GameShelfScreen} />
        <Stack.Screen name="GamesTimer" component={GameTimerScreen} />
        <Stack.Screen name="GamesStitchFive" component={StitchFiveScreen} />
        <Stack.Screen name="GamesTumble" component={TumbleScreen} />
        <Stack.Screen name="GamesConnection" component={ConnectionGameScreen} />
        <Stack.Screen name="GamesJoin" component={REMOTE_GAMES_RELEASE_ENABLED ? JoinTableScreen : RemoteGamesUnavailableScreen} />
        <Stack.Screen name="GamesRemote" component={REMOTE_GAMES_RELEASE_ENABLED ? RemoteGameScreen : RemoteGamesUnavailableScreen} />
        <Stack.Screen name="GamesAccount" component={AuthScreen} />
      </Stack.Navigator>
    </AuthProvider>
  );
}
