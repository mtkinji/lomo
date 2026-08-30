import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import { Input } from '../../../ui/Input';
import { Pressable } from '../../../ui/HapticPressable';
import { colors, spacing } from '../../../theme';

export function RuleSentencePickerField(props: {
  accessibilityLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  value: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      onPress={props.onPress}
      style={props.style}
    >
      <View pointerEvents="none">
        <Input
          accessible={false}
          editable={false}
          elevation="flat"
          size="sm"
          trailingIcon="chevronDown"
          value={props.value}
          variant="outline"
          containerStyle={{ opacity: 1, borderColor: colors.border, paddingHorizontal: spacing.sm }}
        />
      </View>
    </Pressable>
  );
}
