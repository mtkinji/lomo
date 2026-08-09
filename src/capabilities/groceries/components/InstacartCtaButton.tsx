import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { fonts } from '../../../theme';
import { withHapticPress } from '../../../ui/haptics/withHapticPress';

type Props = {
  disabled?: boolean;
  busy?: boolean;
  onPress: () => void;
};

// Provider-owned design values from Instacart's CTA requirements.
// Source: https://docs.instacart.com/developer_platform_api/guide/concepts/design/cta_design
// Retrieved: 2026-08-08. Keep this exception local to the Instacart integration.
export const INSTACART_CTA_STYLE = {
  height: 46,
  borderRadius: 29.5,
  logoSize: 22,
  backgroundColor: '#FFFFFF',
  foregroundColor: '#000000',
  borderColor: '#E8E9EB',
  carrotLeafColor: '#0AAD0A',
  carrotRootColor: '#FF7009',
} as const;

function InstacartCarrotMark() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.logoFrame}
      testID="instacart-carrot-mark"
    >
      <Svg width={INSTACART_CTA_STYLE.logoSize} height={INSTACART_CTA_STYLE.logoSize} viewBox="0 0 42.3 52.9">
        <Path
          fill={INSTACART_CTA_STYLE.carrotLeafColor}
          d="M36.4 8.6c-2.3 0-4 1-5.5 3.2l-4.4 6.4V0H15.9v18.2l-4.4-6.4C9.9 9.6 8.2 8.6 5.9 8.6 2.4 8.6 0 11.2 0 14.4c0 2.7 1.3 4.5 4 6.3l17.1 11 17.1-11c2.7-1.8 4-3.5 4-6.3 0-3.2-2.4-5.8-5.9-5.8Z"
        />
        <Path
          fill={INSTACART_CTA_STYLE.carrotRootColor}
          d="M21.1 34.4c10.2 0 18.5 7.6 18.5 18.5h-37C2.6 42 11 34.4 21.1 34.4Z"
        />
      </Svg>
    </View>
  );
}

export function InstacartCtaButton({ disabled = false, busy = false, onPress }: Props) {
  const unavailable = disabled || busy;
  const onPressWithHaptics = withHapticPress(() => onPress(), 'canvas.selection');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={busy ? 'Preparing Instacart list' : 'Shop on Instacart'}
      accessibilityState={{ disabled: unavailable, busy }}
      disabled={unavailable}
      onPress={onPressWithHaptics}
      style={({ pressed }) => [styles.button, unavailable ? styles.disabled : null, pressed ? styles.pressed : null]}
    >
      <InstacartCarrotMark />
      <Text maxFontSizeMultiplier={1.2} style={styles.label}>
        {busy ? 'Preparing…' : 'Shop on Instacart'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    backgroundColor: INSTACART_CTA_STYLE.backgroundColor,
    borderColor: INSTACART_CTA_STYLE.borderColor,
    borderRadius: INSTACART_CTA_STYLE.borderRadius,
    borderWidth: 0.5,
    flexDirection: 'row',
    gap: 10,
    height: INSTACART_CTA_STYLE.height,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  disabled: { opacity: 0.48 },
  label: {
    color: INSTACART_CTA_STYLE.foregroundColor,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 20,
  },
  logoFrame: {
    alignItems: 'center',
    height: INSTACART_CTA_STYLE.logoSize,
    justifyContent: 'center',
    width: INSTACART_CTA_STYLE.logoSize,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
