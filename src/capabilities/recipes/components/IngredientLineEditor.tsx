import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, spacing, typography } from '../../../theme';
import { Text } from '../../../ui/Typography';

export type EditableIngredientLine = { id: string; originalText: string };

export function IngredientLineEditor({ line, onChange, onRemove }: {
  line: EditableIngredientLine;
  onChange(line: EditableIngredientLine): void;
  onRemove(): void;
}) {
  return (
    <View style={styles.row}>
      <TextInput
        accessibilityLabel="Ingredient"
        value={line.originalText}
        onChangeText={(originalText) => onChange({ ...line, originalText })}
        placeholder="e.g. 2 cups flour"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Remove ingredient" onPress={onRemove} hitSlop={10}>
        <Text tone="secondary">Remove</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: spacing.md, color: colors.textPrimary, backgroundColor: colors.fieldFill,
    ...typography.body,
  },
});
