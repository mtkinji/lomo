import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { HapticsService } from '../../../services/HapticsService';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  tone?: 'coral' | 'turmeric' | 'paper' | 'ghost';
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  maxFontSizeMultiplier?: number;
};

export function GameButton({ children, onPress, disabled, tone = 'coral', icon, style, accessibilityLabel, maxFontSizeMultiplier }: Props) {
  const palette = {
    coral: [gamesTheme.colors.coral, gamesTheme.colors.coralDark],
    turmeric: [gamesTheme.colors.turmeric, gamesTheme.colors.turmericDark],
    paper: [gamesTheme.colors.paper, '#C9BDA7'],
    ghost: ['transparent', 'transparent'],
  }[tone];
  const labelParts = Children.toArray(children);
  const isTextLabel = labelParts.every((part) => typeof part === 'string' || typeof part === 'number');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        HapticsService.trigger('canvas.primary.confirm');
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette[0], shadowColor: palette[1] },
        tone === 'ghost' ? styles.ghost : null,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
        style,
      ]}
    >
      <View style={styles.content}>
        {icon}
        {isTextLabel ? <Text maxFontSizeMultiplier={maxFontSizeMultiplier} style={styles.label}>{labelParts}</Text> : children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    borderRadius: gamesTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: gamesTheme.spacing.xl,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  ghost: { borderWidth: 1, borderColor: 'rgba(32,29,24,0.22)', shadowOpacity: 0 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  label: { color: gamesTheme.colors.ink, fontFamily: gamesTheme.type.display, fontSize: 17 },
  disabled: { opacity: 0.38 },
  pressed: { transform: [{ translateY: 4 }], shadowOffset: { width: 0, height: 2 } },
});
