import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomDrawer } from './BottomDrawer';
import { VStack, HStack } from './Stack';
import { Text, Heading, ButtonLabel } from './Typography';
import { Button, IconButton } from './Button';
import { Icon } from './Icon';
import { ObjectPicker } from './ObjectPicker';
import { SegmentedControl } from './SegmentedControl';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { ActivitySortableField, SortCondition } from '../domain/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  sorts: SortCondition[];
  onApply: (sorts: SortCondition[]) => void;
}

const SORTABLE_FIELDS: Array<{ value: ActivitySortableField; label: string }> = [
  { value: 'title', label: 'Title' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'scheduledDate', label: 'Scheduled date' },
  { value: 'reminderAt', label: 'Reminder' },
  { value: 'difficulty', label: 'Difficulty' },
  { value: 'estimateMinutes', label: 'Estimate' },
  { value: 'createdAt', label: 'Creation date' },
  { value: 'orderIndex', label: 'Manual order' },
];

const DIRECTION_OPTIONS = [
  { value: 'asc', label: 'Asc' },
  { value: 'desc', label: 'Desc' },
];

export function SortDrawer({ visible, onClose, sorts: initialSorts, onApply }: Props) {
  const [localSorts, setLocalSorts] = useState<SortCondition[]>(initialSorts);

  // Sync local state with props when drawer opens
  React.useEffect(() => {
    if (visible) {
      setLocalSorts(initialSorts);
    }
  }, [visible, initialSorts]);

  const handleAddSort = () => {
    setLocalSorts((prev) => [...prev, { field: 'title', direction: 'asc' }]);
  };

  const handleRemoveSort = (index: number) => {
    setLocalSorts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSort = (index: number, updates: Partial<SortCondition>) => {
    const nextSorts = [...localSorts];
    nextSorts[index] = { ...nextSorts[index], ...updates };
    setLocalSorts(nextSorts);
  };

  const handleApply = () => {
    onApply(localSorts);
    onClose();
  };

  const handleReset = () => {
    setLocalSorts([{ field: 'orderIndex', direction: 'asc' }]);
  };

  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['60%']} keyboardAvoidanceEnabled={false}>
      <VStack flex={1} style={styles.container}>
        <HStack justifyContent="space-between" alignItems="center" style={styles.header}>
          <Heading variant="sm">Sort Activities</Heading>
          <Button variant="ghost" size="small" onPress={handleReset}>
            <ButtonLabel size="sm">Reset</ButtonLabel>
          </Button>
        </HStack>

        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <VStack space="md">
            {localSorts.map((sort, index) => (
              <HStack key={index} space="sm" alignItems="center">
                <Text style={styles.index}>{index + 1}.</Text>
                <VStack flex={1} space="xs">
                  <ObjectPicker
                    size="compact"
                    options={SORTABLE_FIELDS}
                    value={sort.field}
                    onValueChange={(val) => handleUpdateSort(index, { field: val as ActivitySortableField })}
                    accessibilityLabel="Select field to sort by"
                    placeholder="Sort by..."
                    presentation="popover"
                    showSearch={false}
                  />
                  <SegmentedControl
                    size="compact"
                    value={sort.direction}
                    onChange={(val) => handleUpdateSort(index, { direction: val as 'asc' | 'desc' })}
                    options={DIRECTION_OPTIONS}
                  />
                </VStack>
                <IconButton
                  variant="ghost"
                  onPress={() => handleRemoveSort(index)}
                  accessibilityLabel="Remove sort level"
                  disabled={localSorts.length <= 1 && index === 0}
                >
                  <Icon name="close" size={18} color={colors.textSecondary} />
                </IconButton>
              </HStack>
            ))}

            <Button variant="ghost" onPress={handleAddSort} style={styles.addBtn}>
              <HStack space="xs" alignItems="center">
                <Icon name="plus" size={16} color={colors.accent} />
                <Text tone="accent">Add sort level</Text>
              </HStack>
            </Button>
          </VStack>

          {/* Footer inside scroll so it's accessible when keyboard is up */}
          <HStack space="md" style={styles.footer} justifyContent="flex-end">
            <Button variant="ghost" onPress={onClose}>
              <ButtonLabel size="md">Cancel</ButtonLabel>
            </Button>
            <Button onPress={handleApply}>
              <ButtonLabel size="md" tone="inverse">
                Apply
              </ButtonLabel>
            </Button>
          </HStack>
        </KeyboardAwareScrollView>
      </VStack>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  index: {
    ...typography.label,
    color: colors.textSecondary,
    width: 20,
  },
  addBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  footer: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});

