import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../../theme';
import { Text } from '../../ui/primitives';

const DEFAULT_OPTIONS_MINUTES = Array.from({ length: 16 }, (_, idx) => (idx + 1) * 15); // 15..240

export function formatDurationMinutes(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} min`;
  const hrs = Math.floor(total / 60);
  const mins = total % 60;
  if (mins === 0) return `${hrs} hr${hrs === 1 ? '' : 's'}`;
  return `${hrs} hr${hrs === 1 ? '' : 's'} ${mins} min`;
}

type DurationPickerProps = {
  valueMinutes: number;
  onChangeMinutes: (next: number) => void;
  /**
   * Optional override of selectable minute values.
   * Values should be positive integers.
   */
  optionsMinutes?: number[];
  /**
   * Text used by screen readers for the picker.
   */
  accessibilityLabel?: string;
};

export function DurationPicker({
  valueMinutes,
  onChangeMinutes,
  optionsMinutes = DEFAULT_OPTIONS_MINUTES,
  accessibilityLabel = 'Duration picker',
}: DurationPickerProps) {
  const options = React.useMemo(() => {
    const normalized = (optionsMinutes ?? [])
      .map((n) => Math.max(1, Math.round(n)))
      .filter((n) => Number.isFinite(n));
    const uniqueSorted = Array.from(new Set(normalized)).sort((a, b) => a - b);
    return uniqueSorted.length > 0 ? uniqueSorted : DEFAULT_OPTIONS_MINUTES;
  }, [optionsMinutes]);

  const selected =
    options.includes(valueMinutes) ? valueMinutes : options[Math.max(0, Math.min(options.length - 1, 1))] ?? 30;

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.iosWheelShell} accessibilityLabel={accessibilityLabel}>
        <View style={styles.iosWheelFrame}>
          <Picker
            selectedValue={selected}
            onValueChange={(value) => onChangeMinutes(Number(value))}
            itemStyle={styles.iosWheelItem}
          >
            {options.map((m) => (
              <Picker.Item key={String(m)} label={formatDurationMinutes(m)} value={m} />
            ))}
          </Picker>
          {/* Gradient masks to create the “faded” wheel edges. */}
          <View pointerEvents="none" style={styles.iosGradientTop}>
            <LinearGradient
              colors={[colors.shell, 'rgba(0,0,0,0)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          </View>
          <View pointerEvents="none" style={styles.iosGradientBottom}>
            <LinearGradient
              colors={['rgba(0,0,0,0)', colors.shell]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          </View>
        </View>
        <Text style={styles.iosHelperText}>{formatDurationMinutes(selected)}</Text>
      </View>
    );
  }

  // Android: use the native picker control (dialog/dropdown depending on platform/theme).
  return (
    <View accessibilityLabel={accessibilityLabel}>
      <View style={styles.androidPickerFrame}>
        <Picker
          selectedValue={selected}
          onValueChange={(value) => onChangeMinutes(Number(value))}
          mode="dialog"
        >
          {options.map((m) => (
            <Picker.Item key={String(m)} label={formatDurationMinutes(m)} value={m} />
          ))}
        </Picker>
      </View>
      <Text style={styles.androidHelperText}>{formatDurationMinutes(selected)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iosWheelShell: {
    alignItems: 'center',
  },
  iosWheelFrame: {
    width: '100%',
    height: 210,
    justifyContent: 'center',
  },
  iosWheelItem: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  iosGradientTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 56,
  },
  iosGradientBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
  },
  iosHelperText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  androidPickerFrame: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
  },
  androidHelperText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
});


