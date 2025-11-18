import { Text, View, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ArcsScreen } from '../features/arcs/ArcsScreen';
import { ArcDetailScreen } from '../features/arcs/ArcDetailScreen';
import { GoalDetailScreen } from '../features/arcs/GoalDetailScreen';
import { ChaptersScreen } from '../features/chapters/ChaptersScreen';
import { ActivitiesScreen } from '../features/activities/ActivitiesScreen';
import { colors, spacing, typography } from '../theme';
import { Icon, IconName } from '../ui/Icon';

export type RootTabParamList = {
  Activities: undefined;
  ArcsStack: undefined;
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
          // Keep the tab bar as a distinct control rail on a white surface
          backgroundColor: colors.canvas,
          borderTopColor: colors.border,
          // Small lift above the iOS home indicator + extra 8px above icons
          paddingTop: spacing.sm,
        },
        // Active item: pine icon + label, inactive: secondary
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size, focused }) => {
          const iconName = getTabIcon(route.name);
          const pillIconColor = focused ? colors.shell : color;

          return (
            <View style={focused ? styles.activeIconPill : styles.iconPill}>
              <Icon name={iconName} color={pillIconColor} size={size - 4} />
            </View>
          );
        },
        tabBarLabel: ({ focused, color }) => (
          <Text
            style={[
              typography.bodySm,
              {
                marginTop: spacing.xs,
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
        name="Activities"
        component={ActivitiesScreen}
        options={{ title: 'Activities' }}
      />
      <Tab.Screen
        name="ArcsStack"
        component={ArcsScreen}
        options={{ title: 'Arcs' }}
      />
      <Tab.Screen name="Chapters" component={ChaptersScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  activeIconPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
});

function getTabIcon(routeName: keyof RootTabParamList): IconName {
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

function getTabLabel(routeName: keyof RootTabParamList): string {
  switch (routeName) {
    case 'Activities':
      return 'Activities';
    case 'ArcsStack':
      return 'Arcs';
    case 'Chapters':
      return 'Chapters';
    default:
      return '';
  }
}



