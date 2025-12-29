import * as React from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ActivityDifficulty, ActivityRepeatRule, ActivityType } from '../../domain/types';
import { colors, spacing, typography } from '../../theme';
import { Badge } from '../../ui/Badge';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { LongTextField } from '../../ui/LongTextField';
import { Combobox, HStack, Input, ObjectPicker, ThreeColumnRow, VStack } from '../../ui/primitives';
import { parseTags } from '../../utils/tags';
import { BottomDrawer } from '../../ui/BottomDrawer';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { DurationPicker } from './DurationPicker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';

export type ActivityDraft = {
  title: string;
  type: ActivityType;
  notes: string;
  steps: Array<{ id: string; title: string }>;
  tags: string[];
  reminderAt: string | null;
  scheduledDate: string | null;
  repeatRule?: ActivityRepeatRule;
  estimateMinutes: number | null;
  difficulty?: ActivityDifficulty;
};

type Props = {
  draft: ActivityDraft;
  onChange: (updater: (prev: ActivityDraft) => ActivityDraft) => void;
  goalLabel?: string | null;
  lockGoalLabel?: boolean;
};

const difficultyOptions = [
  { value: 'very_easy', label: 'Very easy' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'very_hard', label: 'Very hard' },
] as const;

const activityTypeOptions = [
  {
    value: 'task',
    label: 'Task',
    keywords: ['todo', 'to-do', 'action'],
    leftElement: <Icon name="activity" size={16} color={colors.textSecondary} />,
  },
  {
    value: 'checklist',
    label: 'Checklist',
    keywords: ['checklist', 'list', 'packing', 'prep'],
    leftElement: <Icon name="clipboard" size={16} color={colors.textSecondary} />,
  },
  {
    value: 'shopping_list',
    label: 'Shopping list',
    keywords: ['grocery', 'groceries', 'shopping', 'list'],
    leftElement: <Icon name="cart" size={16} color={colors.textSecondary} />,
  },
  {
    value: 'instructions',
    label: 'Recipe / instructions',
    keywords: ['recipe', 'instructions', 'how-to', 'steps'],
    leftElement: <Icon name="chapters" size={16} color={colors.textSecondary} />,
  },
  {
    value: 'plan',
    label: 'Plan',
    keywords: ['plan', 'timeline', 'overview'],
    leftElement: <Icon name="listOrdered" size={16} color={colors.textSecondary} />,
  },
] as const;

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hrs} hr${hrs === 1 ? '' : 's'}`;
  return `${hrs} hr${hrs === 1 ? '' : 's'} ${mins} min`;
}

export function ActivityDraftDetailFields({ draft, onChange, goalLabel, lockGoalLabel }: Props) {
  const [tagsInputDraft, setTagsInputDraft] = React.useState('');
  const [reminderSheetVisible, setReminderSheetVisible] = React.useState(false);
  const [dueDateSheetVisible, setDueDateSheetVisible] = React.useState(false);
  const [repeatSheetVisible, setRepeatSheetVisible] = React.useState(false);
  const [estimateSheetVisible, setEstimateSheetVisible] = React.useState(false);
  const [estimateDraftMinutes, setEstimateDraftMinutes] = React.useState<number>(30);
  const [isDueDatePickerVisible, setIsDueDatePickerVisible] = React.useState(false);
  const [isReminderDateTimePickerVisible, setIsReminderDateTimePickerVisible] = React.useState(false);
  const [isAddingStepInline, setIsAddingStepInline] = React.useState(false);
  const [newStepTitle, setNewStepTitle] = React.useState('');
  const newStepInputRef = React.useRef<TextInput | null>(null);

  const commitInlineDraftStep = React.useCallback(
    (mode: 'continue' | 'exit' = 'exit') => {
      const trimmed = newStepTitle.trim();
      if (!trimmed) {
        setIsAddingStepInline(false);
        setNewStepTitle('');
        return;
      }

      onChange((prev) => ({
        ...prev,
        steps: [
          ...(prev.steps ?? []),
          { id: `draft-step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: trimmed },
        ],
      }));

      setNewStepTitle('');
      if (mode === 'exit') {
        setIsAddingStepInline(false);
        return;
      }
      requestAnimationFrame(() => {
        newStepInputRef.current?.focus();
      });
    },
    [newStepTitle, onChange],
  );

  React.useEffect(() => {
    if (!estimateSheetVisible) return;
    const seed = draft.estimateMinutes != null && draft.estimateMinutes > 0 ? draft.estimateMinutes : 30;
    setEstimateDraftMinutes(Math.max(15, Math.round(seed)));
  }, [draft.estimateMinutes, estimateSheetVisible]);

  const setReminderAt = React.useCallback(
    (iso: string | null) => onChange((prev) => ({ ...prev, reminderAt: iso })),
    [onChange],
  );

  const setScheduledDate = React.useCallback(
    (iso: string | null) => onChange((prev) => ({ ...prev, scheduledDate: iso })),
    [onChange],
  );

  const setRepeatRule = React.useCallback(
    (rule?: ActivityRepeatRule) => onChange((prev) => ({ ...prev, repeatRule: rule })),
    [onChange],
  );

  const setEstimateMinutes = React.useCallback(
    (minutes: number | null) => onChange((prev) => ({ ...prev, estimateMinutes: minutes })),
    [onChange],
  );

  const commitTagsInputDraft = React.useCallback(() => {
    const trimmed = tagsInputDraft.trim();
    if (!trimmed) return;
    const incoming = parseTags(trimmed);
    if (incoming.length === 0) return;
    onChange((prev) => {
      const current = Array.isArray(prev.tags) ? prev.tags : [];
      const keys = new Set(current.map((t) => t.toLowerCase()));
      const next = [...current];
      incoming.forEach((tag) => {
        const key = tag.toLowerCase();
        if (keys.has(key)) return;
        keys.add(key);
        next.push(tag);
      });
      return { ...prev, tags: next };
    });
    setTagsInputDraft('');
  }, [onChange, tagsInputDraft]);

  const removeTag = React.useCallback(
    (tagToRemove: string) => {
      onChange((prev) => ({
        ...prev,
        tags: (prev.tags ?? []).filter((t) => t.toLowerCase() !== tagToRemove.toLowerCase()),
      }));
    },
    [onChange],
  );

  const reminderLabel = React.useMemo(() => {
    if (!draft.reminderAt) return 'Time trigger (reminder)';
    const date = new Date(draft.reminderAt);
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }, [draft.reminderAt]);

  const dueDateLabel = React.useMemo(() => {
    if (!draft.scheduledDate) return 'Deadline (due date)';
    const date = new Date(draft.scheduledDate);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, [draft.scheduledDate]);

  const repeatLabel = React.useMemo(() => {
    if (!draft.repeatRule) return 'Repeat trigger';
    return draft.repeatRule === 'weekdays'
      ? 'Weekdays'
      : draft.repeatRule.charAt(0).toUpperCase() + draft.repeatRule.slice(1);
  }, [draft.repeatRule]);

  const timeEstimateLabel = React.useMemo(() => {
    if (draft.estimateMinutes != null && draft.estimateMinutes > 0) return formatMinutes(draft.estimateMinutes);
    return 'Add a rough time estimate';
  }, [draft.estimateMinutes]);

  const difficultyLabel = React.useMemo(() => {
    if (!draft.difficulty) return 'Optional: how heavy does this feel?';
    const match = difficultyOptions.find((o) => o.value === draft.difficulty);
    return match?.label ?? draft.difficulty;
  }, [draft.difficulty]);

  return (
    <View>
      {/* Title + Steps bundle */}
      <View style={styles.section}>
        <View style={styles.titleStepsBundle}>
          <ThreeColumnRow
            style={styles.titleRow}
            contentStyle={styles.titleRowContent}
            left={
              <View style={[styles.checkboxBase, styles.checkboxPlanned]} />
            }
            right={null}
          >
            <TextInput
              style={styles.titleInput}
              value={draft.title}
              onChangeText={(title) => onChange((prev) => ({ ...prev, title }))}
              placeholder="Name this activity"
              placeholderTextColor={colors.muted}
              multiline
              scrollEnabled={false}
              blurOnSubmit
              returnKeyType="done"
            />
          </ThreeColumnRow>

          {(draft.steps ?? []).length === 0 ? null : (
            <VStack space="xs">
              {(draft.steps ?? []).map((step) => (
                <View key={step.id}>
                  <ThreeColumnRow
                    left={
                      <View style={styles.stepLeftIconBox}>
                        <View
                          style={[
                            styles.checkboxBase,
                            styles.checkboxPlanned,
                            styles.stepCheckbox,
                          ]}
                        />
                      </View>
                    }
                    right={
                      <DropdownMenu>
                        <DropdownMenuTrigger accessibilityLabel="Step actions">
                          <Button
                            variant="ghost"
                            size="icon"
                            iconButtonSize={24}
                            style={styles.removeStepButton}
                            pointerEvents="none"
                            accessible={false}
                          >
                            <Icon name="more" size={16} color={colors.textSecondary} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="bottom" sideOffset={6} align="end">
                          <DropdownMenuItem
                            onPress={() =>
                              onChange((prev) => ({
                                ...prev,
                                steps: (prev.steps ?? []).filter((s) => s.id !== step.id),
                              }))
                            }
                            variant="destructive"
                          >
                            <Text style={styles.destructiveMenuRowText}>Delete step</Text>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    }
                    style={styles.stepRow}
                    contentStyle={styles.stepRowContent}
                  >
                    <Input
                      value={step.title}
                      onChangeText={(text) =>
                        onChange((prev) => ({
                          ...prev,
                          steps: (prev.steps ?? []).map((s) => (s.id === step.id ? { ...s, title: text } : s)),
                        }))
                      }
                      placeholder="Describe the step"
                      size="sm"
                      variant="inline"
                      multiline
                      multilineMinHeight={typography.bodySm.lineHeight}
                      multilineMaxHeight={typography.bodySm.lineHeight * 4 + spacing.sm}
                      blurOnSubmit
                      returnKeyType="done"
                    />
                  </ThreeColumnRow>
                </View>
              ))}
            </VStack>
          )}

          <ThreeColumnRow
            left={<Icon name="plus" size={16} color={colors.accent} />}
            right={null}
            onPress={() => {
              setIsAddingStepInline(true);
              setNewStepTitle('');
              requestAnimationFrame(() => {
                newStepInputRef.current?.focus();
              });
            }}
            accessibilityLabel="Add a step to this activity"
            style={[styles.stepRow, styles.addStepRow]}
            contentStyle={styles.stepRowContent}
          >
            {isAddingStepInline ? (
              <Input
                ref={newStepInputRef}
                value={newStepTitle}
                onChangeText={setNewStepTitle}
                placeholder="Add step"
                size="sm"
                variant="inline"
                multiline={false}
                blurOnSubmit={false}
                returnKeyType="done"
                onSubmitEditing={() => commitInlineDraftStep('continue')}
                onBlur={() => commitInlineDraftStep('exit')}
              />
            ) : (
              <Text style={styles.addStepInlineText}>Add step</Text>
            )}
          </ThreeColumnRow>
        </View>
      </View>

      {/* Triggers */}
      <View style={styles.section}>
        <Text style={styles.inputLabel}>TRIGGERS</Text>
        <View style={styles.rowsCard}>
          <View style={styles.rowPadding}>
            <VStack space="xs">
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => {
                  setReminderSheetVisible(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Edit reminder"
              >
                <ThreeColumnRow
                  left={<Icon name="bell" size={16} color={colors.textSecondary} />}
                  right={
                    draft.reminderAt ? (
                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          setReminderAt(null);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Clear reminder"
                        hitSlop={8}
                      >
                        <Icon name="close" size={16} color={colors.textSecondary} />
                      </Pressable>
                    ) : null
                  }
                >
                  <Text style={[styles.rowValue, draft.reminderAt && styles.rowValueSet]} numberOfLines={1}>
                    {reminderLabel}
                  </Text>
                </ThreeColumnRow>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => setDueDateSheetVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Edit due date"
              >
                <ThreeColumnRow
                  left={<Icon name="today" size={16} color={colors.textSecondary} />}
                  right={
                    draft.scheduledDate ? (
                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          setScheduledDate(null);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Clear due date"
                        hitSlop={8}
                      >
                        <Icon name="close" size={16} color={colors.textSecondary} />
                      </Pressable>
                    ) : null
                  }
                >
                  <Text style={[styles.rowValue, draft.scheduledDate && styles.rowValueSet]} numberOfLines={1}>
                    {dueDateLabel}
                  </Text>
                </ThreeColumnRow>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => setRepeatSheetVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Edit repeat schedule"
              >
                <ThreeColumnRow
                  left={<Icon name="refresh" size={16} color={colors.textSecondary} />}
                  right={
                    draft.repeatRule ? (
                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          setRepeatRule(undefined);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Clear repeat schedule"
                        hitSlop={8}
                      >
                        <Icon name="close" size={16} color={colors.textSecondary} />
                      </Pressable>
                    ) : null
                  }
                >
                  <Text style={[styles.rowValue, draft.repeatRule && styles.rowValueSet]} numberOfLines={1}>
                    {repeatLabel}
                  </Text>
                </ThreeColumnRow>
              </Pressable>
            </VStack>
          </View>
        </View>
      </View>

      {/* Planning */}
      <View style={styles.section}>
        <Text style={styles.inputLabel}>PLANNING</Text>
        <View style={styles.rowsCard}>
          <View style={styles.rowPadding}>
            <VStack space="xs">
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => setEstimateSheetVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Edit time estimate"
              >
                <ThreeColumnRow
                  left={<Icon name="estimate" size={16} color={colors.textSecondary} />}
                  right={
                    draft.estimateMinutes != null ? (
                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          setEstimateMinutes(null);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Clear time estimate"
                        hitSlop={8}
                      >
                        <Icon name="close" size={16} color={colors.textSecondary} />
                      </Pressable>
                    ) : (
                      <Icon name="chevronRight" size={18} color={colors.textSecondary} />
                    )
                  }
                >
                  <Text style={[styles.rowValue, draft.estimateMinutes != null && styles.rowValueSet]} numberOfLines={1}>
                    {timeEstimateLabel}
                  </Text>
                </ThreeColumnRow>
              </Pressable>

              <ObjectPicker
                value={draft.difficulty ?? ''}
                onValueChange={(next) =>
                  onChange((prev) => ({ ...prev, difficulty: (next || undefined) as ActivityDifficulty | undefined }))
                }
                options={difficultyOptions.map((o) => ({ value: o.value, label: o.label }))}
                placeholder="Optional: how heavy does this feel?"
                searchPlaceholder="Search difficulty…"
                emptyText="No difficulty options found."
                allowDeselect
                accessibilityLabel="Edit difficulty"
                presentation="drawer"
                drawerSnapPoints={['55%']}
                size="compact"
                leadingIcon="difficulty"
                fieldVariant="filled"
              />
            </VStack>
          </View>
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.inputLabel}>NOTES</Text>
        <LongTextField
          label="Notes"
          hideLabel
          surfaceVariant="filled"
          value={draft.notes ?? ''}
          placeholder="Add context or reminders for this activity."
          autosaveDebounceMs={0}
          onChange={(next) => onChange((prev) => ({ ...prev, notes: next }))}
        />
      </View>

      {/* Tags */}
      <View style={styles.section}>
        <Text style={styles.inputLabel}>TAGS</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit tags"
          onPress={() => {}}
          style={styles.tagsFieldContainer}
        >
          <View style={styles.tagsFieldInner}>
            {(draft.tags ?? []).map((tag) => (
              <Pressable
                key={tag}
                accessibilityRole="button"
                accessibilityLabel={`Remove tag ${tag}`}
                onPress={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
              >
                <Badge variant="outline" style={styles.tagChip}>
                  <HStack space="xs" alignItems="center">
                    <Text style={styles.tagChipText}>{tag}</Text>
                    <Icon name="close" size={14} color={colors.textSecondary} />
                  </HStack>
                </Badge>
              </Pressable>
            ))}
            <TextInput
              value={tagsInputDraft}
              onChangeText={(next) => {
                if (next.includes(',')) {
                  const parts = next.split(',');
                  const trailing = parts.pop() ?? '';
                  const completed = parts.join(',');
                  onChange((prev) => ({ ...prev, tags: [...(prev.tags ?? []), ...parseTags(completed)] }));
                  setTagsInputDraft(trailing.trimStart());
                  return;
                }
                setTagsInputDraft(next);
              }}
              onBlur={commitTagsInputDraft}
              onSubmitEditing={commitTagsInputDraft}
              placeholder={(draft.tags ?? []).length === 0 ? 'e.g., errands, outdoors' : ''}
              placeholderTextColor={colors.muted}
              style={styles.tagsTextInput}
              returnKeyType="done"
              blurOnSubmit
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </Pressable>
      </View>

      {/* Linked goal (optional) */}
      {goalLabel ? (
        <View style={styles.section}>
          <Text style={styles.inputLabel}>Linked Goal</Text>
          <View style={styles.rowsCard}>
            <View style={styles.rowPadding}>
              <ThreeColumnRow left={<Icon name="goals" size={16} color={colors.textSecondary} />} right={null}>
                <Text style={styles.rowValue} numberOfLines={1}>
                  {goalLabel}
                </Text>
              </ThreeColumnRow>
            </View>
          </View>
          {lockGoalLabel ? null : null}
        </View>
      ) : null}

      {/* Type */}
      <View style={styles.section}>
        <Text style={styles.inputLabel}>Type</Text>
        <ObjectPicker
          value={draft.type}
          onValueChange={(nextType) =>
            onChange((prev) => ({ ...prev, type: (nextType || 'task') as ActivityType }))
          }
          options={activityTypeOptions.map((o) => ({
            value: o.value,
            label: o.label,
            keywords: o.keywords as unknown as string[],
            leftElement: o.leftElement,
          }))}
          placeholder="Select type…"
          searchPlaceholder="Search types…"
          emptyText="No type options found."
          accessibilityLabel="Change activity type"
          presentation="drawer"
          drawerSnapPoints={['60%']}
          size="compact"
          leadingIcon="activity"
          fieldVariant="filled"
        />
      </View>

      {/* Inline pickers */}
      <BottomDrawer
        visible={reminderSheetVisible}
        onClose={() => {
          setReminderSheetVisible(false);
          setIsReminderDateTimePickerVisible(false);
        }}
        snapPoints={['40%']}
        presentation="inline"
        hideBackdrop
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Remind me</Text>
          <VStack space="sm">
            <SheetOption
              label="Later Today"
              onPress={() => {
                const date = new Date();
                date.setHours(18, 0, 0, 0);
                setReminderAt(date.toISOString());
                setReminderSheetVisible(false);
                setIsReminderDateTimePickerVisible(false);
              }}
            />
            <SheetOption
              label="Tomorrow"
              onPress={() => {
                const date = new Date();
                date.setDate(date.getDate() + 1);
                date.setHours(9, 0, 0, 0);
                setReminderAt(date.toISOString());
                setReminderSheetVisible(false);
                setIsReminderDateTimePickerVisible(false);
              }}
            />
            <SheetOption
              label="Next Week"
              onPress={() => {
                const date = new Date();
                date.setDate(date.getDate() + 7);
                date.setHours(9, 0, 0, 0);
                setReminderAt(date.toISOString());
                setReminderSheetVisible(false);
                setIsReminderDateTimePickerVisible(false);
              }}
            />
            <SheetOption label="Pick date & time…" onPress={() => setIsReminderDateTimePickerVisible(true)} />
            <SheetOption
              label="Clear reminder"
              onPress={() => {
                setReminderAt(null);
                setReminderSheetVisible(false);
                setIsReminderDateTimePickerVisible(false);
              }}
            />
          </VStack>
          {isReminderDateTimePickerVisible && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                value={draft.reminderAt ? new Date(draft.reminderAt) : new Date()}
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  if (Platform.OS !== 'ios') setIsReminderDateTimePickerVisible(false);
                  if (!date || event.type === 'dismissed') return;
                  setReminderAt(new Date(date).toISOString());
                  setReminderSheetVisible(false);
                  setIsReminderDateTimePickerVisible(false);
                }}
              />
            </View>
          )}
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={dueDateSheetVisible}
        onClose={() => {
          setDueDateSheetVisible(false);
          setIsDueDatePickerVisible(false);
        }}
        snapPoints={['45%']}
        presentation="inline"
        hideBackdrop
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Due</Text>
          <VStack space="sm">
            <SheetOption
              label="Today"
              onPress={() => {
                const date = new Date();
                date.setHours(23, 0, 0, 0);
                setScheduledDate(date.toISOString());
                setDueDateSheetVisible(false);
              }}
            />
            <SheetOption
              label="Tomorrow"
              onPress={() => {
                const date = new Date();
                date.setDate(date.getDate() + 1);
                date.setHours(23, 0, 0, 0);
                setScheduledDate(date.toISOString());
                setDueDateSheetVisible(false);
              }}
            />
            <SheetOption
              label="Next Week"
              onPress={() => {
                const date = new Date();
                date.setDate(date.getDate() + 7);
                date.setHours(23, 0, 0, 0);
                setScheduledDate(date.toISOString());
                setDueDateSheetVisible(false);
              }}
            />
            <SheetOption label="Pick a date…" onPress={() => setIsDueDatePickerVisible(true)} />
            <SheetOption
              label="Clear due date"
              onPress={() => {
                setScheduledDate(null);
                setDueDateSheetVisible(false);
                setIsDueDatePickerVisible(false);
              }}
            />
          </VStack>
          {isDueDatePickerVisible && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                value={draft.scheduledDate ? new Date(draft.scheduledDate) : new Date()}
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  if (Platform.OS !== 'ios') setIsDueDatePickerVisible(false);
                  if (!date || event.type === 'dismissed') return;
                  const next = new Date(date);
                  next.setHours(23, 0, 0, 0);
                  setScheduledDate(next.toISOString());
                  setDueDateSheetVisible(false);
                }}
              />
            </View>
          )}
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={repeatSheetVisible}
        onClose={() => setRepeatSheetVisible(false)}
        snapPoints={['45%']}
        presentation="inline"
        hideBackdrop
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Repeat</Text>
          <VStack space="sm">
            <SheetOption label="Daily" onPress={() => (setRepeatRule('daily'), setRepeatSheetVisible(false))} />
            <SheetOption label="Weekly" onPress={() => (setRepeatRule('weekly'), setRepeatSheetVisible(false))} />
            <SheetOption label="Weekdays" onPress={() => (setRepeatRule('weekdays'), setRepeatSheetVisible(false))} />
            <SheetOption label="Monthly" onPress={() => (setRepeatRule('monthly'), setRepeatSheetVisible(false))} />
            <SheetOption label="Yearly" onPress={() => (setRepeatRule('yearly'), setRepeatSheetVisible(false))} />
            <SheetOption
              label="Off"
              onPress={() => {
                setRepeatRule(undefined);
                setRepeatSheetVisible(false);
              }}
            />
          </VStack>
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={estimateSheetVisible}
        onClose={() => setEstimateSheetVisible(false)}
        snapPoints={Platform.OS === 'ios' ? ['62%'] : ['45%']}
        presentation="inline"
        hideBackdrop
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Duration</Text>
          <VStack space="md">
            <DurationPicker
              valueMinutes={estimateDraftMinutes}
              onChangeMinutes={setEstimateDraftMinutes}
              accessibilityLabel="Select duration"
              iosUseEdgeFades={false}
            />
            <HStack space="sm">
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => {
                  setEstimateMinutes(null);
                  setEstimateSheetVisible(false);
                }}
              >
                <Text style={styles.sheetRowLabel}>Clear</Text>
              </Button>
              <Button
                variant="primary"
                style={{ flex: 1 }}
                onPress={() => {
                  setEstimateMinutes(estimateDraftMinutes);
                  setEstimateSheetVisible(false);
                }}
              >
                <Text style={[styles.sheetRowLabel, { color: colors.primaryForeground }]}>
                  Save
                </Text>
              </Button>
            </HStack>
          </VStack>
        </View>
      </BottomDrawer>
    </View>
  );
}

function SheetOption({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.sheetRow} onPress={onPress}>
      <Text style={styles.sheetRowLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Match ActivityDetailScreen exactly for shared field visuals.
  section: {
    paddingVertical: spacing.xs,
  },
  rowPadding: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  titleStepsBundle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  titleRow: {
    paddingHorizontal: 0,
    minHeight: 44,
  },
  titleRowContent: {
    paddingVertical: spacing.xs,
  },
  titleInput: {
    ...typography.titleSm,
    color: colors.textPrimary,
    padding: 0,
    flexShrink: 1,
  },
  checkboxBase: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxPlanned: {
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  rowsCard: {
    borderRadius: 12,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: colors.fieldFill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  inputLabel: {
    ...typography.label,
    color: colors.formLabel,
    paddingHorizontal: spacing.sm,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowPressed: {
    backgroundColor: colors.fieldFillPressed,
  },
  rowValue: {
    ...typography.bodySm,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  rowValueSet: {
    color: colors.sumi,
  },
  stepRow: {
    minHeight: 40,
    alignItems: 'center',
  },
  stepRowContent: {
    paddingVertical: 0,
    justifyContent: 'center',
  },
  stepCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
  },
  stepLeftIconBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInput: {
    ...typography.bodySm,
    color: colors.textPrimary,
    paddingVertical: spacing.xs / 2,
  },
  removeStepButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
  },
  addStepRow: {
    marginTop: 0,
  },
  addStepInlineText: {
    ...typography.bodySm,
    color: colors.accent,
    lineHeight: 18,
    ...(Platform.OS === 'android'
      ? ({
          includeFontPadding: false,
          textAlignVertical: 'center',
        } as const)
      : ({ marginTop: -1 } as const)),
  },
  tagsFieldContainer: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: colors.fieldFill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  tagsFieldInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagChipText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  tagsTextInput: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 40,
    minWidth: 40,
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    lineHeight: typography.bodySm.lineHeight + 2,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sheetTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sheetRow: {
    paddingVertical: spacing.sm,
  },
  sheetRowLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  datePickerContainer: {
    marginTop: spacing.sm,
  },
  destructiveMenuRowText: {
    ...typography.body,
    color: colors.destructive,
  },
});


