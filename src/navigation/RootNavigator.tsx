import { useWindowDimensions } from 'react-native';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { ArcsScreen } from '../features/arcs/ArcsScreen';
import { ArcDetailScreen } from '../features/arcs/ArcDetailScreen';
import { GoalDetailScreen } from '../features/arcs/GoalDetailScreen';
import { ChaptersScreen } from '../features/chapters/ChaptersScreen';
import { ActivitiesScreen } from '../features/activities/ActivitiesScreen';
import { colors, spacing, typography } from '../theme';
import { Icon, IconName } from '../ui/Icon';

export type RootDrawerParamList = {
  Activities: undefined;
  ArcsStack: undefined;
  Chapters: undefined;
};

export type ArcsStackParamList = {
  ArcsList: undefined;
  ArcDetail: { arcId: string };
  GoalDetail: { goalId: string };
};

const ArcsStack = createNativeStackNavigator<ArcsStackParamList>();
const Drawer = createDrawerNavigator<RootDrawerParamList>();

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

  return (
    <NavigationContainer theme={navTheme}>
      <Drawer.Navigator
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
            ...typography.body,
          },
          drawerItemStyle: {
            borderRadius: 12,
            marginVertical: 4,
          },
          drawerIcon: ({ color, size }) => {
            const iconName = getDrawerIcon(route.name as keyof RootDrawerParamList);
            return <Icon name={iconName} color={color} size={size ?? 20} />;
          },
        })}
        initialRouteName="Activities"
      >
        <Drawer.Screen
          name="Activities"
          component={ActivitiesScreen}
          options={{ title: 'Activities' }}
        />
        <Drawer.Screen
          name="ArcsStack"
          component={ArcsStackNavigator}
          options={{ title: 'Arcs & Goals' }}
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
    case 'Activities':
      return 'activities';
    case 'ArcsStack':
      return 'arcs';
    case 'Chapters':
      return 'chapters';
    default:
      return 'dot';
  }
}



