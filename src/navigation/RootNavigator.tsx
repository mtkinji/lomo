import { useEffect, useState } from 'react';
import { useWindowDimensions, View, StyleSheet, Platform } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  Theme,
  DrawerActions,
  type NavigationState,
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
import { colors, spacing, typography } from '../theme';
import { Icon, IconName } from '../ui/Icon';
import { Input } from '../ui/Input';

export type RootDrawerParamList = {
  ArcsStack: undefined;
  Goals: undefined;
  Activities: undefined;
  Chapters: undefined;
};

export type ArcsStackParamList = {
  ArcsList: undefined;
  ArcDetail: { arcId: string };
  GoalDetail: { goalId: string };
};

const ArcsStack = createNativeStackNavigator<ArcsStackParamList>();
const Drawer = createDrawerNavigator<RootDrawerParamList>();
const NAV_DRAWER_TOP_OFFSET = 13; // px offset between the status bar and drawer content
const NAV_PERSISTENCE_KEY = 'lomo-nav-state-v1';

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
          if (isMounted) {
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
        drawerContent={(props) => <LomoDrawerContent {...props} />}
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
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

function ArcsStackNavigator() {
  return (
    <ArcsStack.Navigator screenOptions={{ headerShown: false }}>
      <ArcsStack.Screen name="ArcsList" component={ArcsScreen} />
      <ArcsStack.Screen name="ArcDetail" component={ArcDetailScreen} />
      <ArcsStack.Screen name="GoalDetail" component={GoalDetailScreen} />
    </ArcsStack.Navigator>
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
    default:
      return 'dot';
  }
}

function LomoDrawerContent(props: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[
        styles.drawerContentContainer,
        { paddingTop: insets.top + NAV_DRAWER_TOP_OFFSET },
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
        <DrawerItemList {...props} />
      </View>
      <View style={styles.drawerFooter}>
        <View style={styles.profileRow}>
          <View style={styles.avatarPlaceholder} />
          <View>
            <Text style={styles.profileName}>Andrew Watanabe</Text>
            <Text style={styles.profileSubtitle}>View profile & settings</Text>
          </View>
        </View>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerContentContainer: {
    flex: 1,
    paddingBottom: spacing.xl,
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



