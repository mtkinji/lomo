import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import type { Activity, GoalTodoTable } from '../../domain/types';
import { colors, fonts, spacing, typography } from '../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { Input, Text, HStack, VStack } from '../../ui/primitives';
import {
  planGoalTodoTableImport,
  serializeGoalTodoTable,
  type GoalTodoTableImportPlan,
} from './goalTodoTable';

type Props = {
  table: GoalTodoTable | undefined;
  activities: Activity[];
  editorVisible: boolean;
  onRequestEdit: () => void;
  onEditorClose: () => void;
  onSave: (plan: GoalTodoTableImportPlan) => void;
  onToggleActivity: (activityId: string) => void;
  onRemoveView: () => void;
};

export function GoalTodoTableSection({
  table,
  activities,
  editorVisible,
  onRequestEdit,
  onEditorClose,
  onSave,
  onToggleActivity,
  onRemoveView,
}: Props) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editorVisible) return;
    setDraft(table ? serializeGoalTodoTable(table, activities) : '');
    setError('');
  }, [activities, editorVisible, table]);

  const handleSave = () => {
    const result = planGoalTodoTableImport({
      source: draft,
      activities,
      existingTable: table,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSave({
      table: result.table,
      existingUpdates: result.existingUpdates,
      newRows: result.newRows,
    });
    onEditorClose();
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove table view?',
      'The To-dos will stay in this goal and return to the normal list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onRemoveView();
            onEditorClose();
          },
        },
      ],
    );
  };

  return (
    <>
      {table ? (
        <View>
          <HStack alignItems="center" justifyContent="space-between" style={styles.heading}>
            <Text style={styles.helper}>Completed To-dos stay in the table.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit To-do table"
              hitSlop={10}
              onPress={onRequestEdit}
              style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
            >
              <Text style={styles.editLabel}>Edit</Text>
            </Pressable>
          </HStack>
          <View style={styles.tableSurface}>
            <View style={[styles.row, styles.headerRow]}>
              <View style={styles.checkboxSpacer} />
              {table.columns.map((column) => (
                <Text key={column.id} style={[styles.cell, styles.headerCell]}>
                  {column.label}
                </Text>
              ))}
            </View>
            {activities.map((activity, index) => {
              const completed = activity.status === 'done';
              return (
                <View
                  key={activity.id}
                  style={[
                    styles.row,
                    index < activities.length - 1 ? styles.rowDivider : null,
                    completed ? styles.completedRow : null,
                  ]}
                >
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: completed }}
                    accessibilityLabel={
                      completed
                        ? `Mark ${activity.title} incomplete`
                        : `Mark ${activity.title} complete`
                    }
                    hitSlop={8}
                    onPress={() => onToggleActivity(activity.id)}
                    style={({ pressed }) => [
                      styles.checkbox,
                      completed ? styles.checkboxCompleted : null,
                      pressed && styles.pressed,
                    ]}
                  >
                    {completed ? <Icon name="check" size={14} color={colors.primaryForeground} /> : null}
                  </Pressable>
                  {table.columns.map((column) => (
                    <Text key={column.id} style={[styles.cell, completed ? styles.completedCell : null]}>
                      {column.id === table.titleColumnId
                        ? activity.title
                        : activity.todoTableValues?.[column.id] ?? ''}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <BottomDrawer
        visible={editorVisible}
        onClose={onEditorClose}
        snapPoints={['92%']}
        contentExtendsIntoBottomSafeArea
      >
        <BottomDrawerScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.drawerContent}
        >
          <BottomDrawerHeader
            variant="withClose"
            title={table ? 'Edit To-do table' : 'Set up To-do table'}
            subtitle="Each row becomes a To-do. The first line becomes the headers."
            onClose={onEditorClose}
          />
          <VStack space="lg">
            <Input
              accessibilityLabel="To-do table source"
              value={draft}
              onChangeText={(next) => {
                setDraft(next);
                if (error) setError('');
              }}
              multiline
              multilineMinHeight={220}
              multilineMaxHeight={360}
              textAlignVertical="top"
              autoCapitalize="sentences"
              autoCorrect={false}
              placeholder={'County  High point  Elevation\nBeaver  Delano Peak  12,169 ft'}
              errorText={error || undefined}
            />
            <View style={styles.exampleBlock}>
              <Text style={styles.exampleLabel}>How it works</Text>
              <Text style={styles.exampleText}>Separate columns with tabs or at least two spaces.</Text>
              <Text style={styles.exampleText}>“High point” becomes the To-do title; County and Elevation stay with it.</Text>
              <Text style={styles.exampleText}>Existing To-dos with the same title are updated, not duplicated.</Text>
              <Text style={styles.exampleText}>Removing a line here does not delete an existing To-do.</Text>
            </View>
            <HStack space="sm">
              <Button variant="outline" style={styles.drawerButton} onPress={onEditorClose}>
                Cancel
              </Button>
              <Button style={styles.drawerButton} onPress={handleSave}>
                Save
              </Button>
            </HStack>
            {table ? (
              <Button variant="ghost" onPress={handleRemove} accessibilityLabel="Remove To-do table view">
                <Text style={styles.removeLabel}>Remove table view</Text>
              </Button>
            ) : null}
          </VStack>
        </BottomDrawerScrollView>
      </BottomDrawer>
    </>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: spacing.sm },
  helper: { ...typography.bodySm, color: colors.textSecondary },
  editButton: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  editLabel: { ...typography.bodySm, color: colors.accent, fontFamily: fonts.medium },
  tableSurface: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    columnGap: spacing.sm,
  },
  headerRow: { minHeight: 42, backgroundColor: colors.shellAlt },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  completedRow: { backgroundColor: colors.shellAlt },
  checkboxSpacer: { width: 24 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: { backgroundColor: colors.accent, borderColor: colors.accent },
  cell: { ...typography.bodySm, color: colors.textPrimary, flex: 1, minWidth: 0 },
  headerCell: { color: colors.textSecondary, fontFamily: fonts.medium },
  completedCell: { color: colors.textSecondary },
  pressed: { opacity: 0.65 },
  drawerContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'] },
  exampleBlock: { padding: spacing.md, borderRadius: 12, backgroundColor: colors.shellAlt, rowGap: spacing.xs },
  exampleLabel: { ...typography.label, color: colors.textSecondary },
  exampleText: { ...typography.bodySm, color: colors.textPrimary },
  drawerButton: { flex: 1 },
  removeLabel: { ...typography.body, color: colors.destructive, fontFamily: fonts.medium },
});
