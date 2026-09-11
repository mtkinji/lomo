import { Pressable } from '@/src/ui/HapticPressable';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../../theme';
import { Input } from '../../../ui/Input';
import { Text } from '../../../ui/Typography';

export type EditableIngredientLine = { id: string; originalText: string };

export function IngredientLineEditor({ line, onChange, onRemove }: {
  line: EditableIngredientLine;
  onChange(line: EditableIngredientLine): void;
  onRemove(): void;
}) {
  return (
    <View style={styles.row}>
      <Input
        accessibilityLabel="Ingredient"
        value={line.originalText}
        onChangeText={(originalText) => onChange({ ...line, originalText })}
        placeholder="e.g. 2 cups flour"
        wrapperStyle={styles.inputLayout}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Remove ingredient" onPress={onRemove} hitSlop={10}>
        <Text tone="secondary">Remove</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inputLayout: { width: 'auto', flex: 1, minWidth: 0 },
});
