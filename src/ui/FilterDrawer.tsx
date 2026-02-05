import React, { useState, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BottomDrawer } from './BottomDrawer';
import { Card } from './Card';
import { VStack, HStack } from './Stack';
import { Text, ButtonLabel } from './Typography';
import { Button, IconButton } from './Button';
import { Icon } from './Icon';
import { BottomDrawerHeader } from './layout/BottomDrawerHeader';
import { ObjectPicker, ObjectPickerOption } from './ObjectPicker';
import { Input } from './Input';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import { SegmentedControl } from './SegmentedControl';
import { Dialog } from './Dialog';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import {
  Activity,
  FilterGroup,
  FilterGroupLogic,
  FilterCondition,
  FilterOperator,
  ActivityFilterableField,
} from '../domain/types';
import { useAppStore } from '../store/useAppStore';

type UiFilterOperator = FilterOperator | 'past_due';

function isPastDueCondition(condition: Pick<FilterCondition, 'field' | 'operator' | 'value'>): boolean {
  return (
    condition.field === 'scheduledDate' &&
    condition.operator === 'lt' &&
    typeof condition.value === 'string' &&
    condition.value.trim().toLowerCase() === 'today'
  );
}

type RelativeDateUiOperator =
  | 'rel_today'
  | 'rel_tomorrow'
  | 'rel_yesterday'
  | 'rel_in_7_days'
  | 'rel_in_30_days';

type UiFilterOperatorWithRelative = UiFilterOperator | RelativeDateUiOperator;

function isRelativeEqTokenCondition(condition: Pick<FilterCondition, 'operator' | 'value'>): boolean {
  if (condition.operator !== 'eq') return false;
  if (typeof condition.value !== 'string') return false;
  const v = condition.value.trim().toLowerCase();
  return v === 'today' || v === 'tomorrow' || v === 'yesterday' || v === '+7days' || v === '+30days';
}

function getRelativeEqUiOperator(condition: Pick<FilterCondition, 'operator' | 'value'>): RelativeDateUiOperator | null {
  if (!isRelativeEqTokenCondition(condition)) return null;
  const v = String(condition.value).trim().toLowerCase();
  switch (v) {
    case 'today':
      return 'rel_today';
    case 'tomorrow':
      return 'rel_tomorrow';
    case 'yesterday':
      return 'rel_yesterday';
    case '+7days':
      return 'rel_in_7_days';
    case '+30days':
      return 'rel_in_30_days';
    default:
      return null;
  }
}

interface Props {
  visible: boolean;
  onClose: () => void;
  filters: FilterGroup[];
  groupLogic?: FilterGroupLogic;
  onApply: (filters: FilterGroup[], groupLogic: FilterGroupLogic) => void;
}

// Field options with icons
const FILTERABLE_FIELDS: ObjectPickerOption[] = [
  { value: 'title', label: 'Title', leftElement: <Icon name="edit" size={14} color={colors.textSecondary} /> },
  { value: 'status', label: 'Status', leftElement: <Icon name="checkCircle" size={14} color={colors.textSecondary} /> },
  { value: 'priority', label: 'Priority', leftElement: <Icon name="star" size={14} color={colors.textSecondary} /> },
  { value: 'scheduledDate', label: 'Due date', leftElement: <Icon name="today" size={14} color={colors.textSecondary} /> },
  { value: 'reminderAt', label: 'Reminder', leftElement: <Icon name="bell" size={14} color={colors.textSecondary} /> },
  { value: 'tags', label: 'Tags', leftElement: <Icon name="more" size={14} color={colors.textSecondary} /> },
  { value: 'difficulty', label: 'Difficulty', leftElement: <Icon name="difficulty" size={14} color={colors.textSecondary} /> },
  { value: 'estimateMinutes', label: 'Estimate', leftElement: <Icon name="estimate" size={14} color={colors.textSecondary} /> },
  { value: 'goalId', label: 'Goal', leftElement: <Icon name="goals" size={14} color={colors.textSecondary} /> },
  { value: 'type', label: 'Type', leftElement: <Icon name="activities" size={14} color={colors.textSecondary} /> },
];

// Map field value to type for operator lookup
const FIELD_TYPE_MAP: Record<string, string> = {
  title: 'string',
  status: 'status',
  priority: 'priority',
  scheduledDate: 'date',
  reminderAt: 'date',
  tags: 'tag',
  difficulty: 'difficulty',
  estimateMinutes: 'number',
  goalId: 'goal',
  type: 'type',
};

// Helper to get symbol for operator - more universally understood than icons
function getOperatorSymbol(op: FilterOperator): React.ReactNode {
  const style = { fontSize: 12, color: colors.textSecondary, fontWeight: '600' as const };
  switch (op) {
    case 'eq':
      return <Text style={style}>=</Text>;
    case 'neq':
      return <Text style={style}>≠</Text>;
    case 'contains':
      return <Text style={style}>∋</Text>;
    case 'gt':
      return <Text style={style}>&gt;</Text>;
    case 'lt':
      return <Text style={style}>&lt;</Text>;
    case 'gte':
      return <Text style={style}>≥</Text>;
    case 'lte':
      return <Text style={style}>≤</Text>;
    case 'exists':
      return <Text style={style}>✓</Text>;
    case 'nexists':
      return <Text style={style}>∅</Text>;
    case 'in':
      return <Text style={style}>∈</Text>;
    default:
      return null;
  }
}

const OPERATORS_BY_TYPE: Record<string, Array<{ value: FilterOperator; label: string }>> = {
  string: [
    { value: 'contains', label: 'Contains' },
    { value: 'eq', label: 'Is exactly' },
    { value: 'neq', label: 'Is not' },
    { value: 'exists', label: 'Has value' },
    { value: 'nexists', label: 'Is empty' },
  ],
  status: [
    { value: 'eq', label: 'Is' },
    { value: 'neq', label: 'Is not' },
    { value: 'in', label: 'Is in' },
  ],
  priority: [
    { value: 'eq', label: 'Is' },
    { value: 'neq', label: 'Is not' },
    { value: 'exists', label: 'Is set' },
    { value: 'nexists', label: 'Is not set' },
  ],
  date: [
    { value: 'eq', label: 'On' },
    { value: 'gt', label: 'After' },
    { value: 'lt', label: 'Before' },
    { value: 'exists', label: 'Is set' },
    { value: 'nexists', label: 'Is not set' },
  ],
  difficulty: [
    { value: 'eq', label: 'Is' },
    { value: 'neq', label: 'Is not' },
    { value: 'in', label: 'Is one of' },
  ],
  tag: [
    { value: 'contains', label: 'Contains' },
    { value: 'in', label: 'Has any of' },
    { value: 'exists', label: 'Has tags' },
    { value: 'nexists', label: 'No tags' },
  ],
  number: [
    { value: 'eq', label: 'Equals' },
    { value: 'gt', label: 'Greater than' },
    { value: 'lt', label: 'Less than' },
    { value: 'exists', label: 'Is set' },
  ],
  goal: [
    { value: 'eq', label: 'Is' },
    { value: 'neq', label: 'Is not' },
    { value: 'exists', label: 'Is linked' },
    { value: 'nexists', label: 'Not linked' },
  ],
  type: [
    { value: 'eq', label: 'Is' },
    { value: 'neq', label: 'Is not' },
    { value: 'in', label: 'Is one of' },
  ],
};

// Build options with symbols for ObjectPicker
function getOperatorOptions(fieldType: string): ObjectPickerOption[] {
  const ops = OPERATORS_BY_TYPE[fieldType] || OPERATORS_BY_TYPE.string;
  return ops.map((op) => ({
    value: op.value,
    label: op.label,
    leftElement: getOperatorSymbol(op.value),
  }));
}

function getOperatorOptionsForCondition(condition: Pick<FilterCondition, 'field' | 'operator' | 'value'>): ObjectPickerOption[] {
  const fieldType = FIELD_TYPE_MAP[condition.field] || 'string';
  const base = getOperatorOptions(fieldType);
  if (fieldType === 'date') {
    // Special UI sugar: pickable relative dates that avoid needing a third "value" row.
    const relative: ObjectPickerOption[] = [
      { value: 'rel_today', label: 'Today', leftElement: getOperatorSymbol('eq') },
      { value: 'rel_tomorrow', label: 'Tomorrow', leftElement: getOperatorSymbol('eq') },
      { value: 'rel_yesterday', label: 'Yesterday', leftElement: getOperatorSymbol('eq') },
      { value: 'rel_in_7_days', label: 'In 7 days', leftElement: getOperatorSymbol('eq') },
      { value: 'rel_in_30_days', label: 'In 30 days', leftElement: getOperatorSymbol('eq') },
    ];

    // Extra scheduledDate-only preset: Past due (= before today).
    const pastDue: ObjectPickerOption[] =
      condition.field === 'scheduledDate'
        ? [
            {
              value: 'past_due',
              label: 'Past due',
              leftElement: getOperatorSymbol('lt'),
            },
          ]
        : [];

    return [...pastDue, ...relative, ...base];
  }
  return base;
}

const STATUS_OPTIONS: ObjectPickerOption[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Completed' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'cancelled', label: 'Cancelled' },
];

const DIFFICULTY_OPTIONS: ObjectPickerOption[] = [
  { value: 'very_easy', label: '1 · Very easy' },
  { value: 'easy', label: '2 · Easy' },
  { value: 'medium', label: '3 · Medium' },
  { value: 'hard', label: '5 · Hard' },
  { value: 'very_hard', label: '8 · Very hard' },
];

const TYPE_OPTIONS: ObjectPickerOption[] = [
  { value: 'task', label: 'Task' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'shopping_list', label: 'Shopping List' },
  { value: 'instructions', label: 'Instructions' },
  { value: 'plan', label: 'Plan' },
];

export function FilterDrawer({ visible, onClose, filters: initialFilters, groupLogic: initialGroupLogic = 'or', onApply }: Props) {
  const [localGroups, setLocalGroups] = useState<FilterGroup[]>(initialFilters);
  const [localGroupLogic, setLocalGroupLogic] = useState<FilterGroupLogic>(initialGroupLogic);
  const goals = useAppStore((state) => state.goals);

  // Sync local state with props when drawer opens
  React.useEffect(() => {
    if (visible) {
      setLocalGroups(initialFilters);
      setLocalGroupLogic(initialGroupLogic);
    }
  }, [visible, initialFilters, initialGroupLogic]);

  const goalOptions = useMemo<ObjectPickerOption[]>(() => {
    return goals.map((g) => ({ value: g.id, label: g.title }));
  }, [goals]);

  const handleAddGroup = () => {
    setLocalGroups((prev) => [
      ...prev,
      { logic: 'and', conditions: [{ id: Math.random().toString(36).slice(2, 9), field: 'title', operator: 'contains', value: '' }] },
    ]);
  };

  const handleRemoveGroup = (index: number) => {
    setLocalGroups((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCondition = (groupIndex: number) => {
    const nextGroups = [...localGroups];
    nextGroups[groupIndex].conditions.push({
      id: Math.random().toString(36).slice(2, 9),
      field: 'title',
      operator: 'contains',
      value: '',
    });
    setLocalGroups(nextGroups);
  };

  const handleRemoveCondition = (groupIndex: number, conditionIndex: number) => {
    const nextGroups = [...localGroups];
    nextGroups[groupIndex].conditions = nextGroups[groupIndex].conditions.filter((_, i) => i !== conditionIndex);
    if (nextGroups[groupIndex].conditions.length === 0) {
      handleRemoveGroup(groupIndex);
    } else {
      setLocalGroups(nextGroups);
    }
  };

  const handleUpdateCondition = (groupIndex: number, conditionIndex: number, updates: Partial<FilterCondition>) => {
    const nextGroups = [...localGroups];
    const condition = nextGroups[groupIndex].conditions[conditionIndex];
    const nextCondition = { ...condition, ...updates };

    // Reset operator/value if field changes
    if (updates.field && updates.field !== condition.field) {
      const fieldType = FIELD_TYPE_MAP[updates.field] || 'string';
      nextCondition.operator = OPERATORS_BY_TYPE[fieldType][0].value;
      nextCondition.value = '';
    }

    nextGroups[groupIndex].conditions[conditionIndex] = nextCondition;
    setLocalGroups(nextGroups);
  };

  const handleToggleLogic = (groupIndex: number, logic?: 'and' | 'or') => {
    const nextGroups = [...localGroups];
    nextGroups[groupIndex].logic = logic ?? (nextGroups[groupIndex].logic === 'and' ? 'or' : 'and');
    setLocalGroups(nextGroups);
  };

  const handleApply = () => {
    onApply(localGroups, localGroupLogic);
    onClose();
  };

  const handleClearAll = () => {
    setLocalGroups([]);
    setLocalGroupLogic(initialGroupLogic);
  };

  const hasAnyFilters = localGroups.length > 0;

  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['95%']} keyboardAvoidanceEnabled={false}>
      <VStack flex={1} style={styles.container}>
        <BottomDrawerHeader
          title="Filter Activities"
          containerStyle={styles.header}
          titleStyle={styles.headerTitle}
          variant="withClose"
          onClose={onClose}
        />

        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardClearance={spacing.sm}
        >
          {localGroups.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              {/* AND/OR switcher between groups */}
              {groupIndex > 0 && (
                <View style={styles.groupSeparator}>
                  <View style={styles.separatorLine} />
                  <SegmentedControl
                    size="compact"
                    value={localGroupLogic}
                    onChange={(val) => setLocalGroupLogic(val as FilterGroupLogic)}
                    options={[
                      { value: 'and', label: 'and' },
                      { value: 'or', label: 'or' },
                    ]}
                  />
                  <View style={styles.separatorLine} />
                </View>
              )}
              <Card padding="sm" elevation="none" style={styles.groupCard}>
                <VStack space="xs">
                  {group.conditions.map((condition, condIndex) => (
                    <React.Fragment key={condition.id}>
                      {/* AND/OR switcher between conditions */}
                      {condIndex > 0 && (
                        <View style={styles.conditionSeparator}>
                          <View style={styles.conditionSeparatorLine} />
                          <SegmentedControl
                            size="compact"
                            value={group.logic}
                            onChange={(val) => handleToggleLogic(groupIndex, val)}
                            options={[
                              { value: 'and', label: 'and' },
                              { value: 'or', label: 'or' },
                            ]}
                          />
                          <View style={styles.conditionSeparatorLine} />
                        </View>
                      )}
                      <View style={styles.conditionRow}>
                        <VStack space="xs" style={{ flex: 1 }}>
                          {/* Field row with remove button */}
                          <HStack space="xs" alignItems="center">
                            <View style={{ flex: 1 }}>
                              <ObjectPicker
                                size="compact"
                                options={FILTERABLE_FIELDS}
                                value={condition.field}
                                onValueChange={(val) => handleUpdateCondition(groupIndex, condIndex, { field: val as ActivityFilterableField })}
                                accessibilityLabel="Select field"
                                placeholder="Field"
                                presentation="popover"
                                showSearch={false}
                              />
                            </View>
                            <IconButton
                              variant="ghost"
                              onPress={() => handleRemoveCondition(groupIndex, condIndex)}
                              accessibilityLabel="Remove condition"
                            >
                              <Icon name="close" size={16} color={colors.textSecondary} />
                            </IconButton>
                          </HStack>
                          {/* Operator row */}
                          <ObjectPicker
                            size="compact"
                            options={getOperatorOptionsForCondition(condition)}
                            value={(
                              isPastDueCondition(condition)
                                ? 'past_due'
                                : getRelativeEqUiOperator(condition) ?? condition.operator
                            ) as string}
                            onValueChange={(val) => {
                              if (val === 'past_due') {
                                // Store as underlying lt + today so the query engine doesn't need a new operator.
                                handleUpdateCondition(groupIndex, condIndex, { operator: 'lt', value: 'today' });
                                return;
                              }
                              if (val === 'rel_today') {
                                handleUpdateCondition(groupIndex, condIndex, { operator: 'eq', value: 'today' });
                                return;
                              }
                              if (val === 'rel_tomorrow') {
                                handleUpdateCondition(groupIndex, condIndex, { operator: 'eq', value: 'tomorrow' });
                                return;
                              }
                              if (val === 'rel_yesterday') {
                                handleUpdateCondition(groupIndex, condIndex, { operator: 'eq', value: 'yesterday' });
                                return;
                              }
                              if (val === 'rel_in_7_days') {
                                handleUpdateCondition(groupIndex, condIndex, { operator: 'eq', value: '+7days' });
                                return;
                              }
                              if (val === 'rel_in_30_days') {
                                handleUpdateCondition(groupIndex, condIndex, { operator: 'eq', value: '+30days' });
                                return;
                              }
                              handleUpdateCondition(groupIndex, condIndex, { operator: val as FilterOperator });
                            }}
                            accessibilityLabel="Select operator"
                            placeholder="Operator"
                            presentation="popover"
                            showSearch={false}
                          />
                          {/* Value row */}
                          {condition.operator !== 'exists' &&
                            condition.operator !== 'nexists' &&
                            !isPastDueCondition(condition) &&
                            !isRelativeEqTokenCondition(condition) && (
                            <ValueInput
                              field={condition.field}
                              operator={condition.operator}
                              value={condition.value}
                              onChange={(val) => handleUpdateCondition(groupIndex, condIndex, { value: val })}
                              onChangeOperator={(op) => handleUpdateCondition(groupIndex, condIndex, { operator: op })}
                              goalOptions={goalOptions}
                            />
                          )}
                        </VStack>
                      </View>
                    </React.Fragment>
                  ))}
                  <Button
                    variant="ghost"
                    size="small"
                    onPress={() => handleAddCondition(groupIndex)}
                    style={styles.addConditionBtn}
                  >
                    <HStack space="xs" alignItems="center">
                      <Icon name="plus" size={14} color={colors.accent} />
                      <Text tone="accent">Add condition</Text>
                    </HStack>
                  </Button>
                </VStack>
              </Card>
            </React.Fragment>
          ))}

          {localGroups.length === 0 && (
            <Text style={styles.emptyHint}>
              Filter activities by status, date, priority, and more.
            </Text>
          )}

          <Button variant="outline" onPress={handleAddGroup} style={styles.addGroupBtn}>
            <HStack space="xs" alignItems="center">
              <Icon name="plus" size={16} color={colors.textPrimary} />
              <Text>{localGroups.length === 0 ? 'Add a filter' : 'Add filter group'}</Text>
            </HStack>
          </Button>
        </KeyboardAwareScrollView>

        {/* Footer anchored to bottom */}
        <HStack style={styles.footer} justifyContent="space-between" alignItems="center">
          <Button
            variant="ghost"
            onPress={handleClearAll}
            disabled={!hasAnyFilters}
            accessibilityLabel="Clear all filters"
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

function ValueInput({ field, operator, value, onChange, onChangeOperator, goalOptions }: {
  field: ActivityFilterableField;
  operator: FilterOperator;
  value: any;
  onChange: (val: any) => void;
  onChangeOperator?: (op: FilterOperator) => void;
  goalOptions: ObjectPickerOption[];
}) {
  const fieldType = FIELD_TYPE_MAP[field] || 'string';

  switch (fieldType) {
    case 'status':
      return (
        <ObjectPicker
          size="compact"
          options={STATUS_OPTIONS}
          value={String(value)}
          onValueChange={onChange}
          accessibilityLabel="Select status"
          placeholder="Select status..."
          presentation="popover"
          showSearch={false}
        />
      );
    case 'difficulty':
      return (
        <ObjectPicker
          size="compact"
          options={DIFFICULTY_OPTIONS}
          value={String(value)}
          onValueChange={onChange}
          accessibilityLabel="Select difficulty"
          placeholder="Select difficulty..."
          presentation="popover"
          showSearch={false}
        />
      );
    case 'type':
      return (
        <ObjectPicker
          size="compact"
          options={TYPE_OPTIONS}
          value={String(value)}
          onValueChange={onChange}
          accessibilityLabel="Select type"
          placeholder="Select type..."
          presentation="popover"
          showSearch={false}
        />
      );
    case 'goal':
      // Goals list may be long, keep search enabled
      return (
        <ObjectPicker
          size="compact"
          options={goalOptions}
          value={String(value)}
          onValueChange={onChange}
          accessibilityLabel="Select goal"
          placeholder="Select goal..."
          presentation="popover"
        />
      );
    case 'priority':
    case 'number':
      return (
        <Input
          size="sm"
          keyboardType="numeric"
          returnKeyType="done"
          value={String(value || '')}
          onChangeText={(val) => onChange(val === '' ? undefined : Number(val))}
          placeholder="Enter number..."
        />
      );
    case 'date':
      return (
        <DateValueInput
          field={field}
          operator={operator}
          value={value}
          onChange={onChange}
          onChangeOperator={onChangeOperator}
        />
      );
    case 'string':
    case 'tag':
    default:
      return (
        <Input
          size="sm"
          returnKeyType="done"
          value={String(value || '')}
          onChangeText={onChange}
          placeholder="Value..."
          helperText={operator === 'contains' ? 'Tip: use * as a wildcard (e.g. meet* or *tax*)' : undefined}
        />
      );
  }
}

function parseLocalDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  const y = Number.parseInt(match[1] ?? '', 10);
  const m = Number.parseInt(match[2] ?? '', 10);
  const d = Number.parseInt(match[3] ?? '', 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}

function toLocalDateKey(date: Date): string {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addLocalDays(date: Date, deltaDays: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + deltaDays);
  return d;
}

function resolveRelativeDateTokenToDateKey(raw: string, now = new Date()): string | null {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'today') return toLocalDateKey(now);
  if (s === 'tomorrow') return toLocalDateKey(addLocalDays(now, 1));
  if (s === 'yesterday') return toLocalDateKey(addLocalDays(now, -1));

  const m = s.match(/^([+-])\s*(\d+)\s*(day|days|week|weeks)$/i);
  if (!m) return null;
  const sign = m[1] === '-' ? -1 : 1;
  const count = Number.parseInt(m[2] ?? '', 10);
  const unit = (m[3] ?? '').toLowerCase();
  if (!Number.isFinite(count)) return null;
  const n = Math.max(0, Math.floor(count));
  const deltaDays = unit.startsWith('week') ? sign * n * 7 : sign * n;
  return toLocalDateKey(addLocalDays(now, deltaDays));
}

function formatRelativeTokenLabel(raw: string): string | null {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'today') return 'Today';
  if (s === 'tomorrow') return 'Tomorrow';
  if (s === 'yesterday') return 'Yesterday';
  if (s === '+7days') return 'In 7 days';
  if (s === '+30days') return 'In 30 days';

  const m = s.match(/^([+-])\s*(\d+)\s*(day|days|week|weeks)$/i);
  if (!m) return null;
  const sign = m[1] === '-' ? '-' : '+';
  const count = Number.parseInt(m[2] ?? '', 10);
  const unit = (m[3] ?? '').toLowerCase().startsWith('week') ? 'week' : 'day';
  if (!Number.isFinite(count)) return null;
  const n = Math.max(0, Math.floor(count));
  const plural = n === 1 ? '' : 's';
  const unitLabel = `${unit}${plural}`;
  return sign === '+' ? `In ${n} ${unitLabel}` : `${n} ${unitLabel} ago`;
}

function DateValueInput({ field, operator, value, onChange, onChangeOperator }: {
  field: ActivityFilterableField;
  operator: FilterOperator;
  value: any;
  onChange: (val: any) => void;
  onChangeOperator?: (op: FilterOperator) => void;
}) {
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const currentKey =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
      ? value.trim()
      : null;

  const currentRelativeLabel = typeof value === 'string' ? formatRelativeTokenLabel(value) : null;

  const isPastDue =
    field === 'scheduledDate' &&
    operator === 'lt' &&
    typeof value === 'string' &&
    value.trim().toLowerCase() === 'today';

  const displayValue =
    (isPastDue ? 'Past due' : null) ?? currentRelativeLabel ?? currentKey ?? (typeof value === 'string' ? value : '');

  const getInitialDate = (): Date => {
    if (currentKey) {
      const parsed = parseLocalDateKey(currentKey);
      if (parsed) return parsed;
    }
    if (typeof value === 'string') {
      const resolvedKey = resolveRelativeDateTokenToDateKey(value);
      if (resolvedKey) {
        const parsed = parseLocalDateKey(resolvedKey);
        if (parsed) return parsed;
      }
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = new Date(value);
      if (Number.isFinite(parsed.getTime())) return parsed;
    }
    return new Date();
  };

  const commitDate = (date: Date) => {
    // Store local date keys so the filter matches calendar dates (no timezone surprises).
    onChange(toLocalDateKey(date));
  };

  const handlePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') {
      setIsPickerVisible(false);
    }
    if (!date || event.type === 'dismissed') return;
    commitDate(date);
  };

  return (
    <>
      <Input
        size="sm"
        value={displayValue}
        placeholder={field === 'reminderAt' ? 'Select reminder date…' : 'Select due date…'}
        onChangeText={() => {}}
        onFocus={() => setIsPickerVisible(true)}
        showSoftInputOnFocus={false}
        trailingIcon="today"
        onPressTrailingIcon={() => setIsPickerVisible(true)}
      />

      <Dialog
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        title={field === 'reminderAt' ? 'Choose reminder date' : 'Choose due date'}
        size="sm"
      >
        <VStack space="md">
          <DateTimePicker
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            value={getInitialDate()}
            onChange={handlePickerChange}
          />
          <HStack justifyContent="space-between" alignItems="center">
            <Button
              variant="ghost"
              onPress={() => {
                onChange(undefined);
                setIsPickerVisible(false);
              }}
              accessibilityLabel="Clear date"
            >
              <ButtonLabel size="md">Clear</ButtonLabel>
            </Button>
            <Button onPress={() => setIsPickerVisible(false)} accessibilityLabel="Done picking date">
              <ButtonLabel size="md" tone="inverse">Done</ButtonLabel>
            </Button>
          </HStack>
        </VStack>
      </Dialog>
    </>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    // Extra bottom padding handled by footer margin + keyboard-aware padding
  },
  conditionRow: {
    // Each condition row is a vertical stack
  },
  groupCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.shell,
  },
  groupSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  separatorLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginHorizontal: spacing.md,
    textTransform: 'lowercase',
  },
  conditionSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  conditionSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  addConditionBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    marginLeft: -spacing.xs,
  },
  addGroupBtn: {
    marginTop: spacing.lg,
  },
  emptyHint: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.xl,
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

