import { StyleSheet, View } from 'react-native';
import { colors, fonts, radii, spacing, typography } from '../../../theme';
import { Pressable } from '../../../ui/HapticPressable';
import { Text } from '../../../ui/Typography';
import type { PersonalRuleCondition } from '../domain/personalCompositeScreenTimeRule';

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
    return { field: 'Real step', operator: 'is', value: 'complete', operatorEditable: false, valueEditable: false };
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
    return { field: condition.categoryName, operator: 'is', value, operatorEditable: false, valueEditable: false };
  }
  return { field: 'Time', operator: condition.operator === 'before' ? 'is before' : 'is after', value: formatTime(condition.minuteOfDay), operatorEditable: true, valueEditable: true };
}

function Part(props: { label: string; onPress?: () => void; emphasized?: boolean; accessibilityLabel: string }) {
  return (
    <Pressable
      accessibilityRole={props.onPress ? 'button' : 'text'}
      accessibilityLabel={props.accessibilityLabel}
      disabled={!props.onPress}
      onPress={props.onPress}
      style={({ pressed }) => [styles.part, pressed ? styles.pressed : null]}
    >
      <Text numberOfLines={2} style={[styles.partText, props.emphasized ? styles.emphasized : null]}>{props.label}</Text>
      {props.onPress ? <Text aria-hidden style={styles.disclosure}>⌄</Text> : null}
    </Pressable>
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
    <View accessibilityLabel={`${parts.field} ${parts.operator} ${parts.value}`} style={styles.row}>
      <Part accessibilityLabel={`Condition: ${parts.field}`} emphasized label={parts.field} onPress={props.onEditField} />
      <Part accessibilityLabel={`Operator: ${parts.operator}`} label={parts.operator} onPress={parts.operatorEditable ? props.onEditOperator : undefined} />
      <Part accessibilityLabel={`Value: ${parts.value}`} emphasized label={parts.value} onPress={parts.valueEditable ? props.onEditValue : undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    minHeight: 50,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.input,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
  },
  part: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
    justifyContent: 'center',
  },
  partText: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  emphasized: {
    fontFamily: fonts.semibold,
  },
  disclosure: {
    position: 'absolute',
    right: 5,
    color: colors.textSecondary,
    fontSize: 12,
  },
  pressed: { opacity: 0.65 },
});
