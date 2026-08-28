import { StyleSheet, View } from 'react-native';
import { colors, fonts, spacing, typography } from '../../../theme';
import { Text } from '../../../ui/Typography';
import type { PersonalRuleCondition } from '../domain/personalCompositeScreenTimeRule';
import { RuleSentencePickerField } from './RuleSentencePickerField';

function formatTime(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function personalRuleConditionParts(condition: PersonalRuleCondition): {
  field: string;
  operator: string;
  value: string;
  operatorEditable: boolean;
  valueEditable: boolean;
} {
  if (condition.type === 'real_step_complete') {
    return { field: 'Real step', operator: condition.operator === 'is_not' ? 'is not' : 'is', value: 'complete', operatorEditable: true, valueEditable: false };
  }
  if (condition.type === 'focus_active') {
    return { field: 'Focus', operator: condition.operator === 'is_not' ? 'is not' : 'is', value: 'active', operatorEditable: true, valueEditable: false };
  }
  if (condition.type === 'daily_usage') {
    return { field: 'Daily use', operator: condition.operator === 'below' ? 'is below' : 'reaches', value: `${condition.minutes} min`, operatorEditable: true, valueEditable: true };
  }
  if (condition.type === 'budget') {
    const value = condition.preset === 'always_review' ? 'needs review'
      : condition.preset === 'when_hot' ? 'ahead of month'
        : condition.preset === 'at_95_percent' ? '95% used'
          : condition.preset === 'when_over' ? 'fully used'
            : 'needs review';
    return { field: condition.categoryName, operator: 'is', value, operatorEditable: false, valueEditable: true };
  }
  return { field: 'Time', operator: condition.operator === 'before' ? 'is before' : 'is after', value: formatTime(condition.minuteOfDay), operatorEditable: true, valueEditable: true };
}

function Part(props: { label: string; onPress?: () => void; emphasized?: boolean; accessibilityLabel: string; flex: number }) {
  if (props.onPress) {
    return <RuleSentencePickerField accessibilityLabel={props.accessibilityLabel} onPress={props.onPress} value={props.label} style={[styles.part, { flex: props.flex }]} />;
  }
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={props.accessibilityLabel}
      style={[styles.part, styles.staticPart, { flex: props.flex }]}
    >
      <Text numberOfLines={2} style={[styles.partText, props.emphasized ? styles.emphasized : null]}>{props.label}</Text>
    </View>
  );
}

export function PersonalRuleConditionRow(props: {
  condition: PersonalRuleCondition;
  onEditField: () => void;
  onEditOperator: () => void;
  onEditValue: () => void;
}) {
  const parts = personalRuleConditionParts(props.condition);
  return (
    <View style={styles.row}>
      <Part accessibilityLabel={`Condition: ${parts.field}`} emphasized flex={1.05} label={parts.field} onPress={props.onEditField} />
      <Part accessibilityLabel={`Operator: ${parts.operator}`} flex={1.25} label={parts.operator} onPress={parts.operatorEditable ? props.onEditOperator : undefined} />
      <Part accessibilityLabel={`Value: ${parts.value}`} emphasized flex={1.2} label={parts.value} onPress={parts.valueEditable ? props.onEditValue : undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    width: '100%',
  },
  part: {
    minHeight: 44,
    minWidth: 0,
  },
  staticPart: { justifyContent: 'center', paddingHorizontal: spacing.sm },
  partText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  emphasized: {
    fontFamily: fonts.semibold,
  },
});
