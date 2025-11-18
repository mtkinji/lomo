import { Text } from 'react-native';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TodayScreen } from '../features/home/TodayScreen';
import { ArcsScreen } from '../features/arcs/ArcsScreen';
import { ArcDetailScreen } from '../features/arcs/ArcDetailScreen';
import { GoalDetailScreen } from '../features/arcs/GoalDetailScreen';
import { ChaptersScreen } from '../features/chapters/ChaptersScreen';
import { AiChatScreen } from '../features/ai/AiChatScreen';
import { ActivitiesScreen } from '../features/activities/ActivitiesScreen';
import { colors, spacing, typography } from '../theme';
import { Icon, IconName } from '../ui/Icon';

export type RootTabParamList = {
  ArcsStack: undefined;
  Today: undefined;
  AiGuide: undefined;
  Activities: undefined;
  Chapters: undefined;
};

export type ArcsStackParamList = {
  ArcsList: undefined;
  ArcDetail: { arcId: string };
  GoalDetail: { goalId: string };
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const RootStack = createNativeStackNavigator<ArcsStackParamList>();

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
  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="ArcsList" component={TabsNavigator} />
        <RootStack.Screen name="ArcDetail" component={ArcDetailScreen} />
        <RootStack.Screen name="GoalDetail" component={GoalDetailScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopColor: colors.border,
          // Small lift above the iOS home indicator + extra 8px above icons
          paddingTop: spacing.sm,
        },
        // Active item: pine icon + label, inactive: secondary
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size }) => {
          const iconName = getTabIcon(route.name);
          return <Icon name={iconName} color={color} size={size} />;
        },
        tabBarLabel: ({ focused, color }) => (
          <Text
            style={[
              typography.bodySm,
              {
                color,
                fontFamily: focused
                  ? typography.titleSm.fontFamily // bolder for active
                  : typography.bodySm.fontFamily,
              },
            ]}
          >
            {getTabLabel(route.name)}
          </Text>
        ),
      })}
    >
      <Tab.Screen
        name="ArcsStack"
        component={ArcsScreen}
        options={{ title: 'Arcs' }}
      />
      <Tab.Screen name="Activities" component={ActivitiesScreen} />
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="AiGuide"
        component={AiChatScreen}
        options={{ title: 'Chat' }}
      />
      <Tab.Screen name="Chapters" component={ChaptersScreen} />
    </Tab.Navigator>
  );
}

function getTabIcon(routeName: keyof RootTabParamList): IconName {
  switch (routeName) {
    case 'ArcsStack':
      return 'arcs';
    case 'Today':
      return 'home';
    case 'AiGuide':
      return 'aiGuide';
    case 'Activities':
      return 'activities';
    case 'Chapters':
      return 'chapters';
    default:
      return 'dot';
  }
}

function getTabLabel(routeName: keyof RootTabParamList): string {
  switch (routeName) {
    case 'ArcsStack':
      return 'Arcs';
    case 'Today':
      return 'Home';
    case 'AiGuide':
      return 'Chat';
    case 'Activities':
      return 'Activities';
    case 'Chapters':
      return 'Chapters';
    default:
      return '';
  }
}



