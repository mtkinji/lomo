import { useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { View } from 'react-native';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { spacing } from '../../../theme';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Text } from '../../../ui/Typography';

type Props = NativeStackScreenProps<FoodStackParamList, 'RecipeCooking'>;

export function RecipeCookingScreen({ navigation, route }: Props) {
  useEffect(() => { navigation.replace('RecipeHome', { recipeId: route.params.recipeId }); }, [navigation, route.params.recipeId]);
  return <AppShell><PageHeader title="Recipe" onPressBack={() => navigation.goBack()} /><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md }}><Text tone="secondary">Opening the recipe…</Text></View></AppShell>;
}
