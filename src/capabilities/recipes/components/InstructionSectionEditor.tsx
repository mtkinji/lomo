import { Pressable } from '@/src/ui/HapticPressable';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../../theme';
import { Input } from '../../../ui/Input';
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
      <Input
        accessibilityLabel={`Instruction ${position + 1}`}
        value={step.text}
        onChangeText={(text) => onChange({ ...step, text })}
        multiline
        multilineMinHeight={72}
        multilineMaxHeight={120}
        placeholder="What happens next?"
        wrapperStyle={styles.inputLayout}
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
  inputLayout: { width: 'auto', flex: 1, minWidth: 0 },
});
