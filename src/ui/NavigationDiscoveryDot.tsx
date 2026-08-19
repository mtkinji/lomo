import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme';

export function NavigationDiscoveryDot({
  style,
  testID,
}: {
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View
      accessible={false}
      pointerEvents="none"
      testID={testID}
      style={[styles.dot, style]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.navigationDiscovery,
  },
});
