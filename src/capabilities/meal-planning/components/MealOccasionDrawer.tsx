import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { HouseholdMember } from '../../../features/household/data/household';
import { colors, radii, spacing, typography } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Text } from '../../../ui/Typography';

export function MealOccasionDrawer({ visible, title, members, dinerPersonIds, coveredByOtherDishPersonIds, notEatingPersonIds, servings, placementDate, alternateDishes, onClose, onAddAnotherDish, onSave }: {
  visible: boolean;
  title: string;
  members: readonly HouseholdMember[];
  dinerPersonIds: readonly string[];
  coveredByOtherDishPersonIds: readonly string[];
  notEatingPersonIds: readonly string[];
  servings: number;
  placementDate: string | null;
  alternateDishes: ReadonlyArray<{ id: string; title: string }>;
  onClose(): void;
  onAddAnotherDish(dishId: string, personIds: string[]): void;
  onSave(value: { dinerPersonIds: string[]; servings: number; placementDate: string | null; notEatingPersonIds: string[] }): void;
}) {
  const [diners, setDiners] = useState<string[]>([...dinerPersonIds]);
  const [quantity, setQuantity] = useState(servings);
  const [date, setDate] = useState(placementDate ?? '');
  const [showDate, setShowDate] = useState(Boolean(placementDate));
  const [notEating, setNotEating] = useState<string[]>([...notEatingPersonIds]);
  const [alternateFor, setAlternateFor] = useState<string[] | null>(null);
  useEffect(() => {
    if (!visible) return;
    setDiners([...dinerPersonIds]); setQuantity(servings); setDate(placementDate ?? '');
    setShowDate(Boolean(placementDate)); setNotEating([...notEatingPersonIds]); setAlternateFor(null);
  }, [dinerPersonIds, notEatingPersonIds, placementDate, servings, visible]);
  const coveredElsewhere = useMemo(() => new Set(coveredByOtherDishPersonIds), [coveredByOtherDishPersonIds]);
  const unresolved = members.filter((member) => !diners.includes(member.personId) && !coveredElsewhere.has(member.personId) && !notEating.includes(member.personId));
  const toggle = (personId: string) => {
    setDiners((current) => current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId]);
    setNotEating((current) => current.filter((id) => id !== personId));
  };
  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['88%']}>
      <BottomDrawerScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BottomDrawerHeader title={title} subtitle="Who is this dish for, and how much should you make?" variant="withClose" onClose={onClose} />
        <View style={styles.people}>
          {members.map((member) => {
            const selected = diners.includes(member.personId);
            return <Pressable key={member.personId} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={`${selected ? 'Exclude' : 'Include'} ${member.displayName} ${selected ? 'from' : 'in'} ${title}`} onPress={() => toggle(member.personId)} style={styles.personRow}>
              <Text style={styles.flex}>{member.displayName}</Text>
              {selected ? <Icon name="check" size={17} color={colors.pine700} /> : null}
            </Pressable>;
          })}
        </View>
        <View style={styles.quantity}>
          <Text variant="label">Quantity</Text>
          <Button size="sm" variant="outline" disabled={quantity <= 1} onPress={() => setQuantity((value) => Math.max(1, value - 1))}>−</Button>
          <Text>{quantity} servings</Text>
          <Button size="sm" variant="outline" onPress={() => setQuantity((value) => value + 1)}>+</Button>
          <Button size="sm" variant="ghost" onPress={() => setQuantity((value) => value + 1)}>Make one extra</Button>
        </View>
        {showDate ? <TextInput accessibilityLabel="Meal occasion date" placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} style={styles.input} /> : <Button size="sm" variant="ghost" onPress={() => setShowDate(true)}>Add a date</Button>}
        {unresolved.map((member) => <View key={member.personId} style={styles.unresolved}>
          <Text>{member.displayName} still needs another dish or an explicit pass.</Text>
          <View style={styles.actions}>
            <Button size="sm" variant="outline" onPress={() => setAlternateFor([member.personId])}>Add another dish</Button>
            <Button size="sm" variant="ghost" onPress={() => setNotEating((current) => [...new Set([...current, member.personId])])}>Not eating this time</Button>
          </View>
        </View>)}
        {alternateFor ? <View style={styles.unresolved}>
          <Text variant="label">Choose the other dish</Text>
          {alternateDishes.length ? alternateDishes.map((dish) => <Button key={dish.id} size="sm" variant="outline" onPress={() => onAddAnotherDish(dish.id, alternateFor)}>{dish.title}</Button>) : <Text tone="secondary">Add another meal to the plan first.</Text>}
          <Button size="sm" variant="ghost" onPress={() => setAlternateFor(null)}>Cancel</Button>
        </View> : null}
        <Button fullWidth variant="outline" disabled={!diners.length || unresolved.length > 0} onPress={() => onSave({ dinerPersonIds: diners, servings: quantity, placementDate: date.trim() || null, notEatingPersonIds: notEating })}>Save dish</Button>
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  people: { overflow: 'hidden', borderRadius: radii.card, backgroundColor: colors.fieldFill },
  personRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
  flex: { flex: 1 },
  quantity: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  input: { minHeight: 48, borderRadius: radii.input, paddingHorizontal: spacing.md, backgroundColor: colors.fieldFill, color: colors.textPrimary, ...typography.body },
  unresolved: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.input, backgroundColor: 'rgba(249, 115, 22, 0.10)' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
