import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import type { HouseholdMember } from '../../household/data/household';
import type { PersonFoodNeed } from '../domain/householdMealFit';
import { colors, radii, spacing, typography } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Text } from '../../../ui/Typography';

const COMMON_FOODS = [
  { ingredientConcept: 'peanut', displayLabel: 'Peanuts' },
  { ingredientConcept: 'tree nut', displayLabel: 'Tree nuts' },
  { ingredientConcept: 'milk', displayLabel: 'Milk' },
  { ingredientConcept: 'egg', displayLabel: 'Eggs' },
  { ingredientConcept: 'wheat', displayLabel: 'Wheat' },
  { ingredientConcept: 'soy', displayLabel: 'Soy' },
  { ingredientConcept: 'fish', displayLabel: 'Fish' },
  { ingredientConcept: 'shellfish', displayLabel: 'Shellfish' },
  { ingredientConcept: 'sesame', displayLabel: 'Sesame' },
] as const;

const normalize = (value: string) => value.trim().toLocaleLowerCase();

export function FoodNeedsDrawer({ visible, members, foodNeeds, onClose, onSetFoodNeed }: {
  visible: boolean;
  members: readonly HouseholdMember[];
  foodNeeds: readonly PersonFoodNeed[];
  onClose(): void;
  onSetFoodNeed(input: { personId: string; ingredientConcept: string; displayLabel: string; present: boolean }): void;
}) {
  const [personId, setPersonId] = useState(members[0]?.personId ?? '');
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (visible && !members.some((member) => member.personId === personId)) setPersonId(members[0]?.personId ?? '');
  }, [members, personId, visible]);
  const memberNames = useMemo(() => new Map(members.map((member) => [member.personId, member.displayName])), [members]);
  const selectedPersonName = memberNames.get(personId) ?? 'this person';
  const recordedCommonFood = (food: (typeof COMMON_FOODS)[number]) => foodNeeds.find((need) =>
    need.personId === personId
    && (normalize(need.ingredientConcept) === food.ingredientConcept
      || normalize(need.displayLabel) === normalize(food.displayLabel)));
  const commonConcepts = useMemo(() => new Set<string>(COMMON_FOODS.map((food) => food.ingredientConcept)), []);
  const otherFoods = foodNeeds.filter((need) => need.personId === personId
    && !commonConcepts.has(normalize(need.ingredientConcept))
    && !COMMON_FOODS.some((food) => normalize(food.displayLabel) === normalize(need.displayLabel)));
  const add = () => {
    const displayLabel = label.trim();
    if (!personId || !displayLabel) return;
    onSetFoodNeed({ personId, ingredientConcept: displayLabel.toLocaleLowerCase(), displayLabel, present: true });
    setLabel('');
  };
  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['85%']}>
      <BottomDrawerScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BottomDrawerHeader title="Food needs" variant="withClose" onClose={onClose} />
        <View style={styles.form}>
          <View style={styles.section}>
            <Text variant="label" tone="secondary">Person</Text>
            <View style={styles.people}>
              {members.map((member) => {
                const selected = member.personId === personId;
                return <Pressable
                  key={member.personId}
                  accessibilityRole="button"
                  accessibilityLabel={`Record a food need for ${member.displayName}`}
                  accessibilityState={{ selected }}
                  onPress={() => setPersonId(member.personId)}
                  style={[styles.personChip, selected && styles.personChipSelected]}
                ><Text style={selected ? styles.personChipTextSelected : undefined}>{member.displayName}</Text></Pressable>;
              })}
            </View>
          </View>
          <View style={styles.section}>
            <Text variant="label" tone="secondary">Common foods</Text>
            <View style={styles.commonFoods}>
              {COMMON_FOODS.map((food) => {
                const recorded = recordedCommonFood(food);
                const checked = Boolean(recorded);
                return <Pressable
                  key={food.ingredientConcept}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${checked ? 'Remove' : 'Add'} ${food.displayLabel} for ${selectedPersonName}`}
                  accessibilityState={{ checked }}
                  disabled={!personId}
                  onPress={() => onSetFoodNeed({
                    personId,
                    ingredientConcept: recorded?.ingredientConcept ?? food.ingredientConcept,
                    displayLabel: recorded?.displayLabel ?? food.displayLabel,
                    present: !checked,
                  })}
                  style={[styles.foodChip, checked && styles.foodChipSelected]}
                >
                  {checked ? <Icon name="check" size={15} color={colors.primaryForeground} /> : null}
                  <Text style={checked ? styles.foodChipTextSelected : undefined}>{food.displayLabel}</Text>
                </Pressable>;
              })}
            </View>
          </View>
          <View style={styles.section}>
            <Text variant="label" tone="secondary">Other</Text>
            <View style={styles.addRow}>
              <TextInput
                accessibilityLabel="Food or ingredient to avoid"
                placeholder="Food or ingredient"
                placeholderTextColor={colors.textSecondary}
                value={label}
                onChangeText={setLabel}
                onSubmitEditing={add}
                style={styles.input}
              />
              <Button variant="outline" disabled={!personId || !label.trim()} onPress={add}>Add</Button>
            </View>
            {otherFoods.map((need) => <View key={need.id} style={styles.needRow}>
              <View style={styles.needCopy}>
                <Text>{need.displayLabel}</Text>
                <Text tone="secondary">Recorded for {selectedPersonName}</Text>
              </View>
              <Button size="sm" variant="ghost" accessibilityLabel={`Remove ${need.displayLabel} for ${selectedPersonName}`} onPress={() => onSetFoodNeed({ personId: need.personId, ingredientConcept: need.ingredientConcept, displayLabel: need.displayLabel, present: false })}>Remove</Button>
            </View>)}
          </View>
          <Text tone="secondary">Kwilt flags recorded ingredients when available. Always check labels.</Text>
        </View>
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  form: { gap: spacing.lg },
  section: { gap: spacing.sm },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  personChip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.pill, backgroundColor: colors.fieldFill },
  personChipSelected: { backgroundColor: colors.sumi900 },
  personChipTextSelected: { color: colors.primaryForeground },
  commonFoods: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  foodChip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.pill, backgroundColor: colors.fieldFill },
  foodChipSelected: { backgroundColor: colors.sumi900 },
  foodChipTextSelected: { color: colors.primaryForeground },
  addRow: { gap: spacing.sm },
  input: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radii.input, backgroundColor: colors.fieldFill, color: colors.textPrimary, ...typography.body },
  needRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  needCopy: { flex: 1, gap: spacing.xs },
});
