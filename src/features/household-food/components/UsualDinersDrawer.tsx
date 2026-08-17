import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { HouseholdMember } from '../../household/data/household';
import { colors, radii, spacing } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Heading, Text } from '../../../ui/Typography';
import { MAX_MEAL_SERVINGS, MIN_MEAL_SERVINGS } from '../../../capabilities/recipes/domain/mealPreferences';

export function UsualDinersDrawer({ visible, members, usualDinerCount, selectedPersonIds, onClose, onSave }: {
  visible: boolean;
  members: readonly HouseholdMember[];
  usualDinerCount: number;
  selectedPersonIds: readonly string[];
  onClose(): void;
  onSave(input: { usualDinerCount: number; personIds: string[] }): void;
}) {
  const [count, setCount] = useState(usualDinerCount);
  const [selected, setSelected] = useState<string[]>([...selectedPersonIds]);
  useEffect(() => {
    if (!visible) return;
    setCount(Math.max(usualDinerCount, selectedPersonIds.length, MIN_MEAL_SERVINGS));
    setSelected([...selectedPersonIds]);
  }, [selectedPersonIds, usualDinerCount, visible]);
  const toggle = (personId: string) => setSelected((current) => {
    if (current.includes(personId)) return current.filter((id) => id !== personId);
    const next = [...current, personId];
    setCount((value) => Math.max(value, next.length));
    return next;
  });
  const canDecrease = count > Math.max(MIN_MEAL_SERVINGS, selected.length);
  const canIncrease = count < MAX_MEAL_SERVINGS;
  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['70%']}>
      <BottomDrawerScrollView contentContainerStyle={styles.content}>
        <BottomDrawerHeader title="Usually cooking for" variant="withClose" onClose={onClose} />
        <View style={styles.countControl}>
          <Button
            accessibilityLabel="Decrease usual people count"
            accessibilityHint={canDecrease
              ? undefined
              : selected.length >= count
                ? `Remove a selected person to choose fewer than ${selected.length}.`
                : 'The minimum is 1 person.'}
            accessibilityState={{ disabled: !canDecrease }}
            disabled={!canDecrease}
            iconButtonSize={44}
            size="icon"
            variant="outline"
            onPress={() => setCount((value) => Math.max(MIN_MEAL_SERVINGS, value - 1))}
          >
            −
          </Button>
          <Heading accessibilityLabel={`${count} people`} accessibilityLiveRegion="polite" variant="md" style={styles.countLabel}>
            {count} {count === 1 ? 'person' : 'people'}
          </Heading>
          <Button
            accessibilityLabel="Increase usual people count"
            accessibilityState={{ disabled: !canIncrease }}
            disabled={!canIncrease}
            iconButtonSize={44}
            size="icon"
            variant="outline"
            onPress={() => setCount((value) => Math.min(MAX_MEAL_SERVINGS, value + 1))}
          >
            +
          </Button>
        </View>
        <View style={styles.peopleSection}>
          <Text variant="label">People (optional)</Text>
          <View style={styles.group}>
          {members.map((member, index) => {
            const included = selected.includes(member.personId);
            return <View key={member.personId}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: included }}
                accessibilityLabel={`${included ? 'Exclude' : 'Include'} ${member.displayName}`}
                onPress={() => toggle(member.personId)}
                style={styles.row}
              >
                <Text style={styles.rowTitle}>{member.displayName}</Text>
                <View style={[styles.checkbox, included && styles.checkboxSelected]}>
                  {included ? <Icon name="check" size={15} color={colors.primaryForeground} /> : null}
                </View>
              </Pressable>
              {index < members.length - 1 ? <View style={styles.divider} /> : null}
            </View>;
          })}
          </View>
        </View>
        <Button fullWidth variant="outline" onPress={() => onSave({ usualDinerCount: count, personIds: selected })}>Save</Button>
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },
  countControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingVertical: spacing.sm },
  countLabel: { minWidth: 108, textAlign: 'center' },
  peopleSection: { gap: spacing.sm },
  group: { overflow: 'hidden', borderRadius: radii.card, backgroundColor: colors.fieldFill },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md },
  rowTitle: { flex: 1 },
  checkbox: { width: 24, height: 24, borderRadius: radii.control, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { borderColor: colors.sumi900, backgroundColor: colors.sumi900 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.md, backgroundColor: colors.border },
});
