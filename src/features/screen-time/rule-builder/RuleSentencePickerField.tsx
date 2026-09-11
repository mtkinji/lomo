import type { StyleProp, ViewStyle } from 'react-native';
import { PickerFieldTrigger } from '../../../ui/PickerFields';

export function RuleSentencePickerField(props: {
  accessibilityLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  value: string;
}) {
  return (
    <PickerFieldTrigger
      accessibilityLabel={props.accessibilityLabel}
      onPress={props.onPress}
      style={props.style}
      value={props.value}
      options={[{ value: props.value, label: props.value }]}
      placeholder=""
      size="compact"
      allowDeselect={false}
    />
  );
}
