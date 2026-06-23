import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { Button, ButtonLabel, Card, HStack, Text, VStack } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { ActivityGroupingField, ActivityViewGrouping } from '../../domain/types';

type GroupingOption = {
  field: ActivityGroupingField;
  label: string;
  description: string;
  icon: 'activities' | 'goals' | 'today' | 'checkCircle';
};

const GROUPING_OPTIONS: GroupingOption[] = [
  {
    field: 'none',
    label: 'None',
    description: 'Show one continuous list.',
    icon: 'activities',
  },
  {
    field: 'goal',
    label: 'Goal',
    description: 'Priority goals first, then A-Z.',
    icon: 'goals',
  },
  {
    field: 'schedule',
    label: 'Schedule',
    description: 'Overdue, Today, Upcoming, None.',
    icon: 'today',
  },
  {
    field: 'status',
    label: 'Status',
    description: 'Active, Needs review, Waiting, Later.',
    icon: 'checkCircle',
  },
];

export type GroupingDrawerProps = {
  visible: boolean;
  grouping: ActivityViewGrouping | undefined;
  onClose: () => void;
  onApply: (grouping: ActivityViewGrouping) => void;
};

export function GroupingDrawer({ visible, grouping, onClose, onApply }: GroupingDrawerProps) {
  const initialField = grouping?.field ?? 'none';
  const [selectedField, setSelectedField] = useState<ActivityGroupingField>(initialField);

  useEffect(() => {
    if (visible) {
      setSelectedField(initialField);
    }
  }, [initialField, visible]);

  const handleApply = () => {
    onApply({ field: selectedField, collapsedGroupKeys: [] });
    onClose();
  };

  const handleClearAll = () => {
    setSelectedField('none');
  };

  const hasGrouping = selectedField !== 'none';

  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['95%']} keyboardAvoidanceEnabled={false}>
      <VStack flex={1} style={styles.container}>
        <BottomDrawerHeader
          title="Group To-dos"
          containerStyle={styles.header}
          titleStyle={styles.headerTitle}
          variant="withClose"
          onClose={onClose}
        />

        <VStack space="xs" style={styles.content} flex={1}>
          {GROUPING_OPTIONS.map((option) => {
            const selected = option.field === selectedField;
            return (
              <Pressable
                key={option.field}
                accessibilityRole="button"
                accessibilityLabel={`Group by ${option.label}`}
                accessibilityState={{ selected }}
                onPress={() => setSelectedField(option.field)}
                style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressed]}
              >
                <Card
                  padding="none"
                  elevation="none"
                  marginVertical={spacing.xs / 2}
                  style={[styles.groupingCard, selected && styles.groupingCardSelected]}
                >
                  <HStack alignItems="center" space="sm" style={styles.row}>
                    <View style={[styles.iconBubble, selected && styles.iconBubbleSelected]}>
                      <Icon
                        name={option.icon}
                        size={16}
                        color={selected ? colors.primaryForeground : colors.textSecondary}
                      />
                    </View>
                    <VStack style={styles.rowText} space="xs">
                      <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>
                        {option.label}
                      </Text>
                      <Text style={styles.rowDescription}>{option.description}</Text>
                    </VStack>
                    {selected ? <Icon name="check" size={16} color={colors.accent} /> : null}
                  </HStack>
                </Card>
              </Pressable>
            );
          })}
        </VStack>

        <HStack style={styles.footer} justifyContent="space-between" alignItems="center">
          <Button
            variant="ghost"
            onPress={handleClearAll}
            disabled={!hasGrouping}
            accessibilityLabel="Clear grouping"
          >
            <ButtonLabel size="md">Clear all</ButtonLabel>
          </Button>

          <HStack space="md" justifyContent="flex-end">
            <Button variant="ghost" onPress={onClose}>
              <ButtonLabel size="md">Cancel</ButtonLabel>
            </Button>
            <Button onPress={handleApply}>
              <ButtonLabel size="md" tone="inverse">
                Apply
              </ButtonLabel>
            </Button>
          </HStack>
        </HStack>
      </VStack>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    // BottomDrawer handles safe area padding
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    textAlign: 'left',
  },
  content: {
    paddingHorizontal: spacing.md,
  },
  rowPressable: {
    borderRadius: 12,
  },
  rowPressed: {
    opacity: 0.85,
  },
  groupingCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.shell,
  },
  groupingCardSelected: {
    borderColor: colors.pine700,
    backgroundColor: colors.pine50,
  },
  row: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.shellAlt,
  },
  iconBubbleSelected: {
    backgroundColor: colors.pine700,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  rowLabelSelected: {
    fontFamily: typography.label.fontFamily,
  },
  rowDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footer: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
