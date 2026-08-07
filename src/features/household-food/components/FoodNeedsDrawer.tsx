import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { HouseholdMember } from '../../household/data/household';
import type { PersonFoodNeed } from '../domain/householdMealFit';
import { colors, radii, spacing, typography } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Text } from '../../../ui/Typography';

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
  const add = () => {
    const displayLabel = label.trim();
    if (!personId || !displayLabel) return;
    onSetFoodNeed({ personId, ingredientConcept: displayLabel.toLocaleLowerCase(), displayLabel, present: true });
    setLabel('');
  };
  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['85%']}>
      <BottomDrawerScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BottomDrawerHeader title="Food needs" subtitle="Record foods a specific person needs to avoid." variant="withClose" onClose={onClose} />
        <View style={styles.people}>
          {members.map((member) => <Pressable
            key={member.personId}
            accessibilityRole="button"
            accessibilityLabel={`Record a food need for ${member.displayName}`}
            accessibilityState={{ selected: member.personId === personId }}
            onPress={() => setPersonId(member.personId)}
            style={[styles.personChip, member.personId === personId && styles.personChipSelected]}
          ><Text>{member.displayName}</Text></Pressable>)}
        </View>
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
          <Button variant="outline" disabled={!personId || !label.trim()} onPress={add}>Add food to avoid</Button>
        </View>
        <Text tone="secondary">Kwilt checks recorded ingredients when evidence is available. Always review labels and ingredients for your household.</Text>
        {foodNeeds.map((need) => <View key={need.id} style={styles.needRow}>
          <View style={styles.needCopy}>
            <Text>{need.displayLabel}</Text>
            <Text tone="secondary">{memberNames.get(need.personId) ?? 'Household member'}</Text>
          </View>
          <Button size="sm" variant="ghost" accessibilityLabel={`Remove ${need.displayLabel} for ${memberNames.get(need.personId) ?? 'household member'}`} onPress={() => onSetFoodNeed({ personId: need.personId, ingredientConcept: need.ingredientConcept, displayLabel: need.displayLabel, present: false })}>Remove</Button>
        </View>)}
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  personChip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.pill, backgroundColor: colors.fieldFill },
  personChipSelected: { backgroundColor: colors.pine100 },
  addRow: { gap: spacing.sm },
  input: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radii.input, backgroundColor: colors.fieldFill, color: colors.textPrimary, ...typography.body },
  needRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  needCopy: { flex: 1, gap: spacing.xs },
});
