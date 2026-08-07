import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { SettingsDivider, SettingsGroup, SettingsPage, SettingsRow } from '../../ui/SettingsSurface';
import { FoodNeedsDrawer } from '../household-food/components/FoodNeedsDrawer';
import { UsualDinersDrawer } from '../household-food/components/UsualDinersDrawer';
import { useHouseholdMealPreferencesStore } from '../household-food/runtime/useHouseholdMealPreferencesStore';

export function MealsSettingsView({ dinerSummary, foodNeedsSummary, onOpenDiners, onOpenFoodNeeds }: {
  dinerSummary: string;
  foodNeedsSummary: string;
  onOpenDiners(): void;
  onOpenFoodNeeds(): void;
}) {
  return (
    <SettingsGroup title="HOUSEHOLD FIT" footer="People determine who a dish is for. Each dish keeps its own adjustable quantity.">
      <View>
        <SettingsRow title="Usually cooking for" value={dinerSummary} onPress={onOpenDiners} />
        <SettingsDivider />
        <SettingsRow title="Food needs" value={foodNeedsSummary} onPress={onOpenFoodNeeds} />
      </View>
    </SettingsGroup>
  );
}

export function MealsSettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList, 'SettingsMeals'>>();
  const projection = useHouseholdMealPreferencesStore((state) => state.projection);
  const setUsualDiners = useHouseholdMealPreferencesStore((state) => state.setUsualDiners);
  const setFoodNeed = useHouseholdMealPreferencesStore((state) => state.setFoodNeed);
  const [drawer, setDrawer] = useState<'diners' | 'food_needs' | null>(null);
  const dinerSummary = projection?.usualDinerPersonIds.length
    ? `${projection.usualDinerPersonIds.length} ${projection.usualDinerPersonIds.length === 1 ? 'person' : 'people'}`
    : 'Choose';
  const foodNeedsSummary = projection?.foodNeeds.length ? `${projection.foodNeeds.length} recorded` : 'Add';
  const run = (mutation: Promise<void>, title: string) => void mutation.catch((caught) => {
    Alert.alert(title, caught instanceof Error ? caught.message : 'Try again in a moment.');
  });
  return (
    <SettingsPage title="Meals" onBack={() => navigation.goBack()}>
      <MealsSettingsView
        dinerSummary={dinerSummary}
        foodNeedsSummary={foodNeedsSummary}
        onOpenDiners={() => setDrawer('diners')}
        onOpenFoodNeeds={() => setDrawer('food_needs')}
      />
      <UsualDinersDrawer
        visible={drawer === 'diners'}
        members={projection?.members ?? []}
        selectedPersonIds={projection?.usualDinerPersonIds ?? []}
        onClose={() => setDrawer(null)}
        onSave={(personIds) => { run(setUsualDiners(personIds), 'Usual diners not saved'); setDrawer(null); }}
      />
      <FoodNeedsDrawer
        visible={drawer === 'food_needs'}
        members={projection?.members ?? []}
        foodNeeds={projection?.foodNeeds ?? []}
        onClose={() => setDrawer(null)}
        onSetFoodNeed={(input) => run(setFoodNeed(input), 'Food need not saved')}
      />
    </SettingsPage>
  );
}
