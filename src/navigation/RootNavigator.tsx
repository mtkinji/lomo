import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TodayScreen } from '../features/home/TodayScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ArcsScreen } from '../features/arcs/ArcsScreen';
import { ArcDetailScreen } from '../features/arcs/ArcDetailScreen';
import { ChaptersScreen } from '../features/chapters/ChaptersScreen';
import { AiChatScreen } from '../features/ai/AiChatScreen';
import { ActivitiesScreen } from '../features/activities/ActivitiesScreen';
import { colors } from '../theme';
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
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const ArcsStack = createNativeStackNavigator<ArcsStackParamList>();

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
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.canvas,
            borderTopColor: colors.border,
          },
          tabBarActiveTintColor: colors.textPrimary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarIcon: ({ color, size }) => {
            const iconName = getTabIcon(route.name);
            return <Icon name={iconName} color={color} size={size} />;
          },
        })}
      >
        <Tab.Screen
          name="ArcsStack"
          component={ArcsStackNavigator}
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
    </NavigationContainer>
  );
}

function ArcsStackNavigator() {
  return (
    <ArcsStack.Navigator screenOptions={{ headerShown: false }}>
      <ArcsStack.Screen name="ArcsList" component={ArcsScreen} />
      <ArcsStack.Screen name="ArcDetail" component={ArcDetailScreen} />
    </ArcsStack.Navigator>
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



