import type {ReactNode} from 'react';
import {View, StyleSheet, type StyleProp, type ViewStyle} from 'react-native';
import {colors, spacing} from '../theme';

/** Internal shared material and slots. Features compose Input instead of importing this frame. */
export function InputFrame({children, style, focused, error, footer, onFooterHeight}: {
  children: ReactNode;
  style: StyleProp<ViewStyle>;
  focused: boolean;
  error: boolean;
  footer?: ReactNode;
  onFooterHeight: (height: number) => void;
}) {
  const flattened = StyleSheet.flatten(style);
  return (
    <View style={[style, styles.frame]}>
      <View style={styles.row}>{children}</View>
      {footer != null ? (
        <View style={styles.footer} onLayout={event => onFooterHeight(event.nativeEvent.layout.height)}>{footer}</View>
      ) : null}
      {focused || error ? (
        <View pointerEvents="none" accessible={false} style={[
          StyleSheet.absoluteFill, styles.indicator,
          {borderColor: error ? colors.destructive : colors.accent, borderRadius: flattened?.borderRadius}, // @kwilt-brand-moment: existing semantic input focus indicator
        ]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center'},
  row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  footer: {paddingTop: spacing.sm},
  indicator: {borderWidth: 2},
});
