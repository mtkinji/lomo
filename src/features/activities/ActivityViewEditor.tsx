import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { VStack, HStack, Text } from '../../ui/primitives';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { ButtonLabel } from '../../ui/Typography';
import { Icon } from '../../ui/Icon';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { colors } from '../../theme/colors';
import { styles } from './activitiesScreenStyles';
import type { ActivityViewLayout, KanbanGroupBy } from '../../domain/types';

export type ActivityViewEditorProps = {
  visible: boolean;
  onClose: () => void;
  mode: 'create' | 'settings';
  viewName: string;
  onChangeViewName: (name: string) => void;
  showCompleted: boolean;
  onUpdateShowCompleted: (show: boolean) => void;
  layout: ActivityViewLayout;
  onChangeLayout: (layout: ActivityViewLayout) => void;
  kanbanGroupBy: KanbanGroupBy;
  onChangeKanbanGroupBy: (groupBy: KanbanGroupBy) => void;
  onConfirm: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

const LAYOUT_OPTIONS: Array<{ value: ActivityViewLayout; label: string }> = [
  { value: 'list', label: 'List' },
  { value: 'kanban', label: 'Kanban' },
];

const KANBAN_GROUP_OPTIONS: Array<{ value: KanbanGroupBy; label: string }> = [
  { value: 'status', label: 'Status' },
  { value: 'goal', label: 'Goal' },
  { value: 'priority', label: 'Priority' },
  { value: 'phase', label: 'Phase' },
];

export function ActivityViewEditor({
  visible,
  onClose,
  mode,
  viewName,
  onChangeViewName,
  showCompleted,
  onUpdateShowCompleted,
  layout,
  onChangeLayout,
  kanbanGroupBy,
  onChangeKanbanGroupBy,
  onConfirm,
  onDuplicate,
  onDelete,
}: ActivityViewEditorProps) {
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={mode === 'create' ? 'New view' : 'View settings'}
      size="md"
      showHeaderDivider
      footer={
        <HStack style={styles.viewEditorActions} space="sm" alignItems="center">
          <Button variant="ghost" size="small" onPress={onClose}>
            <ButtonLabel size="md">Cancel</ButtonLabel>
          </Button>
          <Button size="small" onPress={onConfirm}>
            <ButtonLabel size="md" tone="inverse">
              Save
            </ButtonLabel>
          </Button>
        </HStack>
      }
    >
      <VStack space="md">
        <View>
          <Text style={styles.viewEditorFieldLabel}>View name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Top priorities"
            placeholderTextColor={colors.textSecondary}
            value={viewName}
            onChangeText={onChangeViewName}
          />
        </View>

        <View>
          <Text style={styles.viewEditorFieldLabel}>Layout</Text>
          <SegmentedControl
            value={layout}
            onChange={onChangeLayout}
            options={LAYOUT_OPTIONS}
            size="compact"
          />
        </View>

        {layout === 'kanban' && (
          <View>
            <Text style={styles.viewEditorFieldLabel}>Group by</Text>
            <SegmentedControl
              value={kanbanGroupBy}
              onChange={onChangeKanbanGroupBy}
              options={KANBAN_GROUP_OPTIONS}
              size="compact"
            />
          </View>
        )}

        {mode === 'settings' && (
          <>
            <HStack
              style={styles.viewEditorToggleRow}
              alignItems="center"
              justifyContent="space-between"
            >
              <Text style={styles.viewEditorToggleLabel}>Show completed </Text>
              <Pressable
                accessibilityRole="switch"
                accessibilityLabel="Toggle visibility of completed activities section"
                accessibilityState={{ checked: showCompleted }}
                onPress={() => onUpdateShowCompleted(!showCompleted)}
                style={[
                  styles.viewEditorToggleTrack,
                  showCompleted && styles.viewEditorToggleTrackOn,
                ]}
              >
                <View
                  style={[
                    styles.viewEditorToggleThumb,
                    showCompleted && styles.viewEditorToggleThumbOn,
                  ]}
                />
              </Pressable>
            </HStack>

            <VStack style={styles.viewEditorShortcutsSection} space="xs">
              <Text style={styles.viewEditorFieldLabel}>View actions</Text>
              <HStack style={styles.viewEditorSecondaryActions} space="sm" alignItems="center">
                <Button
                  variant="outline"
                  size="small"
                  onPress={onDuplicate}
                  accessibilityRole="button"
                  accessibilityLabel="Duplicate this view"
                >
                  <HStack alignItems="center" space="xs">
                    <Icon name="clipboard" size={14} color={colors.textPrimary} />
                    <Text style={styles.viewEditorShortcutLabel}>Duplicate view</Text>
                  </HStack>
                </Button>
                <Button
                  variant="destructive"
                  size="small"
                  onPress={onDelete}
                  accessibilityRole="button"
                  accessibilityLabel="Delete this view"
                >
                  <HStack alignItems="center" space="xs">
                    <Icon name="trash" size={14} color={colors.canvas} />
                    <Text style={styles.viewEditorShortcutDestructiveLabel}>Delete view</Text>
                  </HStack>
                </Button>
              </HStack>
            </VStack>
          </>
        )}
      </VStack>
    </Dialog>
  );
}

