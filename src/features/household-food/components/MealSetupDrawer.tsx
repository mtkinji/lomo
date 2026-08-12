import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Text } from '../../../ui/Typography';

function SetupRow({ title, value, onPress }: { title: string; value: string; onPress(): void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text tone="secondary" numberOfLines={1}>{value}</Text>
      <Icon name="chevronRight" size={17} color={colors.textSecondary} />
    </Pressable>
  );
}

export function MealSetupDrawer({ visible, dinerSummary, foodNeedsSummary, onOpenDiners, onOpenFoodNeeds, onDone, onNotNow }: {
  visible: boolean;
  dinerSummary: string;
  foodNeedsSummary: string;
  onOpenDiners(): void;
  onOpenFoodNeeds(): void;
  onDone(): void;
  onNotNow(): void;
}) {
  return (
    <BottomDrawer visible={visible} onClose={onNotNow} dynamicSizing snapPoints={['65%']}>
      <BottomDrawerScrollView contentContainerStyle={styles.content}>
        <BottomDrawerHeader
          title="Make Meals fit your household"
          subtitle="Two quick choices help Kwilt suggest useful quantities and flag recorded food needs."
          variant="minimal"
          titleVariant="md"
        />
        <View style={styles.group}>
          <SetupRow title="Usually cooking for" value={dinerSummary} onPress={onOpenDiners} />
          <View style={styles.divider} />
          <SetupRow title="Food needs" value={foodNeedsSummary} onPress={onOpenFoodNeeds} />
        </View>
        <Button fullWidth variant="outline" onPress={onDone}>Done</Button>
        <Button fullWidth variant="ghost" onPress={onNotNow}>Not now</Button>
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  group: { overflow: 'hidden', borderRadius: radii.card, backgroundColor: colors.fieldFill },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  rowTitle: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.md, backgroundColor: colors.border },
  pressed: { opacity: 0.72 },
});
