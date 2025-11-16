import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TodayScreen } from '../features/home/TodayScreen';
import { ArcsScreen } from '../features/arcs/ArcsScreen';
import { ChaptersScreen } from '../features/chapters/ChaptersScreen';
import { colors } from '../theme';
import { Icon, IconName } from '../ui/Icon';

export type RootTabParamList = {
  Today: undefined;
  Arcs: undefined;
  Chapters: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

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
        <Tab.Screen name="Today" component={TodayScreen} />
        <Tab.Screen name="Arcs" component={ArcsScreen} />
        <Tab.Screen name="Chapters" component={ChaptersScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function getTabIcon(routeName: keyof RootTabParamList): IconName {
  switch (routeName) {
    case 'Today':
      return 'today';
    case 'Arcs':
      return 'arcs';
    case 'Chapters':
      return 'chapters';
    default:
      return 'dot';
  }
}



