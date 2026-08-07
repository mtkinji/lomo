import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { HouseholdMember } from '../../household/data/household';
import { colors, radii, spacing } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Text } from '../../../ui/Typography';

export function UsualDinersDrawer({ visible, members, selectedPersonIds, onClose, onSave }: {
  visible: boolean;
  members: readonly HouseholdMember[];
  selectedPersonIds: readonly string[];
  onClose(): void;
  onSave(personIds: string[]): void;
}) {
  const [selected, setSelected] = useState<string[]>([...selectedPersonIds]);
  useEffect(() => { if (visible) setSelected([...selectedPersonIds]); }, [selectedPersonIds, visible]);
  const toggle = (personId: string) => setSelected((current) => current.includes(personId)
    ? current.filter((id) => id !== personId)
    : [...current, personId]);
  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['70%']}>
      <BottomDrawerScrollView contentContainerStyle={styles.content}>
        <BottomDrawerHeader title="Usually cooking for" subtitle="Choose people, not serving-size classes." variant="withClose" onClose={onClose} />
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
        <Button fullWidth variant="outline" disabled={!selected.length} onPress={() => onSave(selected)}>Save</Button>
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  group: { overflow: 'hidden', borderRadius: radii.card, backgroundColor: colors.fieldFill },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md },
  rowTitle: { flex: 1 },
  checkbox: { width: 24, height: 24, borderRadius: radii.control, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { borderColor: colors.sumi900, backgroundColor: colors.sumi900 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.md, backgroundColor: colors.border },
});
