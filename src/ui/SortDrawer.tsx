import React, { useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { BottomDrawer } from './BottomDrawer';
import { Card } from './Card';
import { VStack, HStack } from './Stack';
import { Text, ButtonLabel } from './Typography';
import { Button, IconButton } from './Button';
import { Icon } from './Icon';
import { BottomDrawerHeader } from './layout/BottomDrawerHeader';
import { ObjectPicker, ObjectPickerOption } from './ObjectPicker';
import { SegmentedControl } from './SegmentedControl';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { ActivitySortMode, ActivitySortableField, SortCondition } from '../domain/types';
import type { IconName } from './Icon';

interface Props {
  visible: boolean;
  onClose: () => void;
  /**
   * Structured (multi-level) sorts. An empty array means "use view default".
   */
  sorts: SortCondition[];
  /**
   * Legacy view default sort (used when `sorts` is empty).
   */
  defaultSortMode: ActivitySortMode;
  onApply: (sorts: SortCondition[]) => void;
}

const SORTABLE_FIELDS: Array<{
  value: ActivitySortableField;
  label: string;
  leftElement?: React.ReactNode;
}> = [
  { value: 'title', label: 'Title', leftElement: <Icon name="edit" size={14} color={colors.textSecondary} /> },
  { value: 'status', label: 'Status', leftElement: <Icon name="checkCircle" size={14} color={colors.textSecondary} /> },
  { value: 'priority', label: 'Priority', leftElement: <Icon name="star" size={14} color={colors.textSecondary} /> },
  { value: 'scheduledDate', label: 'Due date', leftElement: <Icon name="today" size={14} color={colors.textSecondary} /> },
  { value: 'reminderAt', label: 'Reminder', leftElement: <Icon name="bell" size={14} color={colors.textSecondary} /> },
  { value: 'difficulty', label: 'Difficulty', leftElement: <Icon name="difficulty" size={14} color={colors.textSecondary} /> },
  { value: 'estimateMinutes', label: 'Estimate', leftElement: <Icon name="estimate" size={14} color={colors.textSecondary} /> },
  { value: 'createdAt', label: 'Creation date', leftElement: <Icon name="activities" size={14} color={colors.textSecondary} /> },
];

const DIRECTION_OPTIONS = [
  { value: 'asc', label: 'Asc' },
  { value: 'desc', label: 'Desc' },
];

const FIELD_TYPE_MAP: Record<ActivitySortableField, 'string' | 'number' | 'date' | 'status'> = {
  title: 'string',
  status: 'status',
  priority: 'number',
  scheduledDate: 'date',
  reminderAt: 'date',
  difficulty: 'number',
  estimateMinutes: 'number',
  createdAt: 'date',
  orderIndex: 'number',
};

function getSortIcon(field: ActivitySortableField, direction: 'asc' | 'desc'): IconName {
  const type = FIELD_TYPE_MAP[field] || 'string';
  switch (type) {
    case 'number':
      return direction === 'asc' ? 'sortNumericAsc' : 'sortNumericDesc';
    case 'date':
      return direction === 'asc' ? 'sortCalendarAsc' : 'sortCalendarDesc';
    case 'string':
    case 'status':
    default:
      return direction === 'asc' ? 'sortAlphaAsc' : 'sortAlphaDesc';
  }
}

type SortMode = 'default' | 'custom';

type LocalSortCondition = SortCondition & { id: string };

function newId() {
  return Math.random().toString(36).slice(2, 9);
}

function getDefaultSortLabel(mode: ActivitySortMode): string {
  switch (mode) {
    case 'titleAsc':
      return 'Title (A→Z)';
    case 'titleDesc':
      return 'Title (Z→A)';
    case 'dueDateAsc':
      return 'Due date (Soonest)';
    case 'dueDateDesc':
      return 'Due date (Latest)';
    case 'priority':
      return 'Priority';
    case 'manual':
    default:
      return 'Manual order';
  }
}

export function SortDrawer({ visible, onClose, sorts: initialStructuredSorts, defaultSortMode, onApply }: Props) {
  const [mode, setMode] = useState<SortMode>(initialStructuredSorts.length > 0 ? 'custom' : 'default');
  const [localSorts, setLocalSorts] = useState<LocalSortCondition[]>(
    initialStructuredSorts.map((s) => ({ ...s, id: newId() })),
  );

  // Sync local state with props when drawer opens
  React.useEffect(() => {
    if (visible) {
      setMode(initialStructuredSorts.length > 0 ? 'custom' : 'default');
      setLocalSorts(initialStructuredSorts.map((s) => ({ ...s, id: newId() })));
    }
  }, [visible, initialStructuredSorts]);

  const handleAddSort = () => {
    const usedFields = new Set(localSorts.map((s) => s.field));
    const firstAvailable = SORTABLE_FIELDS.find((f) => !usedFields.has(f.value));
    if (firstAvailable) {
      setLocalSorts((prev) => [...prev, { id: newId(), field: firstAvailable.value, direction: 'asc' }]);
    }
  };

  const handleChangeMode = (next: SortMode) => {
    setMode(next);
    if (next === 'custom' && localSorts.length === 0) {
      setLocalSorts([{ id: newId(), field: SORTABLE_FIELDS[0].value, direction: 'asc' }]);
    }
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
    if (mode === 'default') {
      onApply([]);
      onClose();
      return;
    }
    onApply(localSorts.map(({ id: _id, ...rest }) => rest));
    onClose();
  };

  const handleClearAll = () => {
    setMode('default');
    setLocalSorts([]);
  };

  const hasAnyCustomSorts = localSorts.length > 0 || mode === 'custom';

  const usedFields = new Set(localSorts.map((s) => s.field));
  const allFieldsUsed = usedFields.size >= SORTABLE_FIELDS.length;

  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['95%']} keyboardAvoidanceEnabled={false}>
      <VStack flex={1} style={styles.container}>
        <BottomDrawerHeader
          title="Sort Activities"
          containerStyle={styles.header}
          titleStyle={styles.headerTitle}
          variant="withClose"
          onClose={onClose}
        />

        <VStack style={styles.content} space="md" flex={1}>
          <SegmentedControl
            size="compact"
            value={mode}
            onChange={(val) => handleChangeMode(val as SortMode)}
            options={[
              { value: 'default', label: defaultSortMode === 'manual' ? 'Manual' : 'Default' },
              { value: 'custom', label: 'Custom' },
            ]}
          />

          {mode === 'default' ? (
            <Card padding="md" elevation="none" style={styles.modeCard}>
              <VStack space="xs">
                <Text style={styles.modeTitle}>Default: {getDefaultSortLabel(defaultSortMode)}</Text>
                <Text style={styles.modeBody}>
                  {defaultSortMode === 'manual'
                    ? 'Drag activities in the list to reorder them.'
                    : 'Switch to Custom to add multi-level sorts.'}
                </Text>
              </VStack>
            </Card>
          ) : (
            <VStack space={0}>
              <DraggableFlatList
                data={localSorts}
                keyExtractor={(item) => item.id}
                onDragEnd={({ data }) => setLocalSorts(data)}
                activationDistance={10}
                scrollEnabled={false}
                renderItem={({ item, drag, isActive, getIndex }: RenderItemParams<LocalSortCondition>) => {
                  const index = getIndex?.() ?? 0;
                  const filteredOptions = SORTABLE_FIELDS.filter(
                    (f) => !usedFields.has(f.value) || f.value === item.field,
                  );

                  return (
                    <Card
                      padding="none"
                      elevation={isActive ? 'lift' : 'none'}
                      style={[styles.sortCard, isActive && styles.sortCardActive]}
                      marginVertical={spacing.xs / 2}
                    >
                      <HStack space="xs" alignItems="center" style={styles.sortRow}>
                        <Pressable
                          onLongPress={drag}
                          delayLongPress={100}
                          accessibilityRole="button"
                          accessibilityLabel="Reorder sort level"
                          hitSlop={10}
                          style={styles.dragHandle}
                        >
                          <Icon name="menu" size={18} color={colors.textSecondary} />
                        </Pressable>

                        <View style={{ flex: 1 }}>
                          <ObjectPicker
                            size="compact"
                            options={filteredOptions as unknown as ObjectPickerOption[]}
                            value={item.field}
                            onValueChange={(val) => handleUpdateSort(index, { field: val as ActivitySortableField })}
                            accessibilityLabel="Select field to sort by"
                            placeholder="Sort by..."
                            presentation="popover"
                            showSearch={false}
                            allowDeselect={false}
                          />
                        </View>

                      <IconButton
                        variant="ghost"
                        onPress={() =>
                          handleUpdateSort(index, {
                            direction: item.direction === 'asc' ? 'desc' : 'asc',
                          })
                        }
                        accessibilityLabel={`Sort ${
                          item.direction === 'asc' ? 'ascending' : 'descending'
                        }. Tap to toggle.`}
                        style={styles.compactIconButton}
                      >
                        <Icon
                          name={getSortIcon(item.field, item.direction)}
                          size={20}
                          color={colors.textSecondary}
                        />
                      </IconButton>

                        <IconButton
                          variant="ghost"
                          onPress={() => handleRemoveSort(index)}
                          accessibilityLabel="Remove sort level"
                          disabled={localSorts.length <= 1}
                          style={styles.compactIconButton}
                        >
                          <Icon name="close" size={18} color={colors.textSecondary} />
                        </IconButton>
                      </HStack>
                    </Card>
                  );
                }}
              />

              {!allFieldsUsed && (
                <Button
                  variant="secondary"
                  onPress={handleAddSort}
                  style={styles.addBtn}
                >
                  <HStack space="xs" alignItems="center">
                    <Icon name="plus" size={18} color={colors.textPrimary} />
                    <ButtonLabel>Add sort level</ButtonLabel>
                  </HStack>
                </Button>
              )}
            </VStack>
          )}
        </VStack>

        {/* Footer anchored to bottom */}
        <HStack style={styles.footer} justifyContent="space-between" alignItems="center">
          <Button
            variant="ghost"
            onPress={handleClearAll}
            disabled={!hasAnyCustomSorts}
            accessibilityLabel="Clear all sorting"
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
    flex: 1,
  },
  modeCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.shell,
  },
  modeTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  modeBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  sortCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.shell,
  },
  sortCardActive: {
    backgroundColor: colors.gray100,
  },
  sortRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  dragHandle: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactIconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    marginTop: spacing.md,
  },
  footer: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    // Let the BottomDrawer sheet provide the surface styling (background, elevation).
    // Avoid a "separate white footer bar" treatment.
  },
});
