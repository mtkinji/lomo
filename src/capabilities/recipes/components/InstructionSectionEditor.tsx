import { Pressable } from '@/src/ui/HapticPressable';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, spacing, typography } from '../../../theme';
import { Text } from '../../../ui/Typography';

export type EditableInstructionStep = { id: string; text: string };

export function InstructionSectionEditor({ step, position, onChange, onRemove }: {
  step: EditableInstructionStep;
  position: number;
  onChange(step: EditableInstructionStep): void;
  onRemove(): void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.number}>{position + 1}</Text>
      <TextInput
        accessibilityLabel={`Instruction ${position + 1}`}
        value={step.text}
        onChangeText={(text) => onChange({ ...step, text })}
        multiline
        placeholder="What happens next?"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
      />
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove instruction ${position + 1}`} onPress={onRemove} hitSlop={10}>
        <Text tone="secondary">Remove</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  number: { width: 22, paddingTop: 13, textAlign: 'center' },
  input: {
    flex: 1, minHeight: 72, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textPrimary,
    backgroundColor: colors.fieldFill, textAlignVertical: 'top', ...typography.body,
  },
});
