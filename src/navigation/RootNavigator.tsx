import { useEffect, useState } from 'react';
import { useWindowDimensions, View, StyleSheet, Platform } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  Theme,
  DrawerActions,
  NavigatorScreenParams,
  type NavigationState,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, Pressable } from '@gluestack-ui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArcsScreen } from '../features/arcs/ArcsScreen';
import { ArcDetailScreen } from '../features/arcs/ArcDetailScreen';
import { GoalDetailScreen } from '../features/arcs/GoalDetailScreen';
import { ChaptersScreen } from '../features/chapters/ChaptersScreen';
import { GoalsScreen } from '../features/goals/GoalsScreen';
import { ActivitiesScreen } from '../features/activities/ActivitiesScreen';
import { SettingsHomeScreen } from '../features/account/SettingsHomeScreen';
import { AppearanceSettingsScreen } from '../features/account/AppearanceSettingsScreen';
import { ProfileSettingsScreen } from '../features/account/ProfileSettingsScreen';
import { colors, spacing, typography } from '../theme';
import { Icon, IconName } from '../ui/Icon';
import { Input } from '../ui/Input';
import { DevToolsScreen } from '../features/dev/DevToolsScreen';

export type RootDrawerParamList = {
  ArcsStack: NavigatorScreenParams<ArcsStackParamList> | undefined;
  Goals: undefined;
  Activities: undefined;
  Chapters: undefined;
  Settings: undefined;
  DevTools: undefined;
};

export type ArcsStackParamList = {
  ArcsList: undefined;
  ArcDetail: {
    arcId: string;
    /**
     * When true, ArcDetail should immediately open the Goal creation wizard
     * so the user can adopt a new goal for this Arc without hunting for the
     * inline button.
     */
    openGoalCreation?: boolean;
  };
  GoalDetail: {
    goalId: string;
    /**
     * Optional hint about where the user navigated from. When set to
     * "goalsTab", the Goal detail back affordance should return to the Goals
     * canvas rather than stepping back through any existing Arcs stack
     * history.
     */
    entryPoint?: 'goalsTab' | 'arcsStack';
  };
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  SettingsAppearance: undefined;
  SettingsProfile: undefined;
  SettingsAiModel: undefined;
};

const ArcsStack = createNativeStackNavigator<ArcsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const Drawer = createDrawerNavigator<RootDrawerParamList>();
export const rootNavigationRef = createNavigationContainerRef<RootDrawerParamList>();
// Match the AppShell's top gutter so the drawer content aligns with the page header.
const NAV_DRAWER_TOP_OFFSET = spacing.sm;
// Bump this key whenever the top-level navigator structure changes in a way
// that could make previously persisted state incompatible (for example,
// renaming routes like "Arcs" -> "ArcsStack"). This ensures we don't restore
// stale navigation state that can prevent certain screens (like Arcs) from
// being reachable.
const NAV_PERSISTENCE_KEY = 'lomo-nav-state-v2';

const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.canvas,
    card: colors.canvas,
    border: colors.border,
    text: colors.textPrimary,
    primary: colors.accent,
  },
};

export function RootNavigator() {
  const { width } = useWindowDimensions();
  const drawerWidth = width * 0.8;
  const showDevTools = __DEV__;

  const [isNavReady, setIsNavReady] = useState(false);
  const [initialState, setInitialState] = useState<NavigationState | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    const restoreState = async () => {
      try {
        // On web, let the URL drive navigation instead of persisted state.
        if (Platform.OS === 'web') {
          return;
        }

        const savedStateString = await AsyncStorage.getItem(NAV_PERSISTENCE_KEY);
        if (savedStateString) {
          const state = JSON.parse(savedStateString) as NavigationState;

          // Defensive guard: if the persisted root routes don't match the
          // current drawer structure, ignore the saved state so navigation
          // can re-initialize cleanly.
          const allowedRootRoutes: Array<keyof RootDrawerParamList> = [
            'ArcsStack',
            'Goals',
            'Activities',
            'Chapters',
            'Settings',
            'DevTools',
          ];

          const rootHasUnexpectedRoute =
            !state?.routes ||
            state.routes.some(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (route: any) => !allowedRootRoutes.includes(route.name as keyof RootDrawerParamList),
            );

          if (!rootHasUnexpectedRoute && isMounted) {
            setInitialState(state);
          }
        }
      } catch (e) {
        console.warn('Failed to load navigation state', e);
      } finally {
        if (isMounted) {
          setIsNavReady(true);
        }
      }
    };

    restoreState();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isNavReady) {
    // Let the app shell/font loading in App.tsx handle the visible loading state.
    return null;
  }

  return (
    <NavigationContainer
      ref={rootNavigationRef}
      theme={navTheme}
      initialState={initialState}
      onStateChange={(state) => {
        if (!state) return;
        AsyncStorage.setItem(NAV_PERSISTENCE_KEY, JSON.stringify(state)).catch((e) => {
          console.warn('Failed to persist navigation state', e);
        });
      }}
    >
      <Drawer.Navigator
        drawerContent={(props) => <TakadoDrawerContent {...props} />}
        // Normalize drawer behavior so that tapping "Arcs" always lands on the
        // Arcs list root, even if the current nested screen is a deep detail
        // view like GoalDetail. This keeps the mental model of the primary
        // nav items mapping to their top-level canvases.
        screenListeners={({ navigation, route }) => ({
          drawerItemPress: (event) => {
            if (route.name !== 'ArcsStack') {
              return;
            }
            // Override the default so we always jump to the ArcsList screen
            // inside the Arcs stack instead of treating a tap on an already
            // focused drawer item as a no-op.
            event.preventDefault();
            navigation.navigate('ArcsStack', {
              screen: 'ArcsList',
            });
          },
        })}
        screenOptions={({ route }) => ({
          headerShown: false,
          // Use "slide" so the entire app canvas shifts right while the drawer stays pinned,
          // similar to the ChatGPT mobile app behavior.
          drawerType: 'slide',
          drawerStyle: {
            backgroundColor: colors.canvas,
            width: drawerWidth,
          },
          overlayColor: 'rgba(15,23,42,0.35)',
          sceneContainerStyle: {
            backgroundColor: colors.shell,
          },
          drawerActiveTintColor: colors.accent,
          drawerInactiveTintColor: colors.textSecondary,
          drawerLabelStyle: {
            ...typography.bodySm,
          },
          drawerItemStyle: {
            borderRadius: 12,
            marginVertical: spacing.xs / 4,
            paddingVertical: spacing.xs / 8,
            minHeight: 32,
          },
          drawerIcon: ({ color, size }) => {
            const iconName = getDrawerIcon(route.name as keyof RootDrawerParamList);
            return <Icon name={iconName} color={color} size={size ?? 20} />;
          },
        })}
        initialRouteName="Activities"
      >
        <Drawer.Screen
          name="ArcsStack"
          component={ArcsStackNavigator}
          options={{ title: 'Arcs' }}
        />
        <Drawer.Screen
          name="Goals"
          component={GoalsScreen}
          options={{ title: 'Goals' }}
        />
        <Drawer.Screen
          name="Activities"
          component={ActivitiesScreen}
          options={{ title: 'Activities' }}
        />
        <Drawer.Screen
          name="Chapters"
          component={ChaptersScreen}
          options={{ title: 'Chapters' }}
        />
        {showDevTools && (
          <Drawer.Screen
            name="DevTools"
            component={DevToolsScreen}
            options={{ title: 'Dev Mode' }}
          />
        )}
        <Drawer.Screen
          name="Settings"
          component={SettingsStackNavigator}
          options={{ title: 'Settings' }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

function ArcsStackNavigator() {
  return (
    <ArcsStack.Navigator
      screenOptions={{
        headerShown: false,
        // Use a consistent horizontal slide animation so Arcs → ArcDetail →
        // GoalDetail (and back) all feel like part of the same flow, whether
        // you entered from the Arcs canvas or from the Goals list.
        animation: 'slide_from_right',
        animationTypeForReplace: 'push',
        fullScreenGestureEnabled: true,
      }}
    >
      <ArcsStack.Screen name="ArcsList" component={ArcsScreen} />
      <ArcsStack.Screen name="ArcDetail" component={ArcDetailScreen} />
      <ArcsStack.Screen name="GoalDetail" component={GoalDetailScreen} />
    </ArcsStack.Navigator>
  );
}

function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsHomeScreen} />
      <SettingsStack.Screen
        name="SettingsAppearance"
        component={AppearanceSettingsScreen}
      />
      <SettingsStack.Screen
        name="SettingsProfile"
        component={ProfileSettingsScreen}
      />
      <SettingsStack.Screen
        name="SettingsAiModel"
        component={require('../features/account/AiModelSettingsScreen').AiModelSettingsScreen}
      />
    </SettingsStack.Navigator>
  );
}

function getDrawerIcon(routeName: keyof RootDrawerParamList): IconName {
  switch (routeName) {
    case 'ArcsStack':
      return 'arcs';
    case 'Goals':
      return 'goals';
    case 'Activities':
      return 'activities';
    case 'Chapters':
      return 'chapters';
    case 'Settings':
      return 'dot';
    case 'DevTools':
      return 'dev';
    default:
      return 'dot';
  }
}

function TakadoDrawerContent(props: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();

  // Hide the top-level Settings item from the drawer list while keeping the
  // Settings screen available for navigation from the profile row.
  const filteredRoutes = props.state.routes.filter(
    (route: { name: string }) => route.name !== 'Settings',
  );
  const filteredRouteNames = props.state.routeNames.filter(
    (name: string) => name !== 'Settings',
  );

  // Keep the "focused" drawer item in sync with the *visible* routes.
  // When the active route is the hidden Settings screen, we don't want any
  // drawer item to appear focused; otherwise presses on DevTools would be
  // treated as a no-op because the drawer thinks it's already selected.
  const activeRoute = props.state.routes[props.state.index];
  const filteredIndex = filteredRoutes.findIndex(
    (route: { key: string }) => route.key === activeRoute?.key,
  );

  const filteredState = {
    ...props.state,
    routes: filteredRoutes,
    routeNames: filteredRouteNames,
    // If the active route is hidden (i.e., Settings), filteredIndex will be -1.
    // DrawerItemList only uses this to check `i === state.index` for focus,
    // so -1 simply means "no visible item is focused".
    index: filteredIndex,
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[
        styles.drawerContentContainer,
        {
          paddingTop: insets.top + NAV_DRAWER_TOP_OFFSET,
          paddingBottom: spacing.xl + insets.bottom,
        },
      ]}
    >
      <View style={styles.drawerHeader}>
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search arcs, goals, activities"
          accessibilityLabel="Search navigation"
          leadingIcon="search"
          returnKeyType="search"
          clearButtonMode="while-editing"
          containerStyle={styles.searchContainer}
        />
      </View>
      <View style={styles.drawerMain}>
        <DrawerItemList
          {...props}
          state={filteredState}
        />
      </View>
      <View style={styles.drawerFooter}>
        <Pressable
          style={styles.profileRow}
          accessibilityRole="button"
          accessibilityLabel="View profile and settings"
          onPress={() => {
            props.navigation.navigate('Settings');
          }}
        >
          <View style={styles.avatarPlaceholder} />
          <View>
            <Text style={styles.profileName}>Andrew Watanabe</Text>
            <Text style={styles.profileSubtitle}>View profile & settings</Text>
          </View>
        </Pressable>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerContentContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  drawerHeader: {
    marginBottom: spacing.lg,
  },
  searchContainer: {
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  drawerMain: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  drawerFooter: {
    paddingTop: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.shell,
  },
  profileName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  profileSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});



