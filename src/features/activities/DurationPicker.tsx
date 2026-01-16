import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../../theme';
import { Text } from '../../ui/primitives';

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

// Default options for days (0-7) and hours (0-23)
const DEFAULT_DAY_OPTIONS = Array.from({ length: 8 }, (_, i) => i); // 0..7
const DEFAULT_HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i); // 0..23

export function formatDurationMinutes(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const days = Math.floor(total / MINUTES_PER_DAY);
  const hrs = Math.floor((total % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
  const mins = total % MINUTES_PER_HOUR;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hrs > 0) parts.push(`${hrs} hr${hrs === 1 ? '' : 's'}`);
  if (mins > 0) parts.push(`${mins} min`);

  // If total is 0, show "0 min"
  return parts.length > 0 ? parts.join(' ') : '0 min';
}

type DurationPickerProps = {
  valueMinutes: number;
  onChangeMinutes: (next: number) => void;
  /**
   * Optional override of selectable minute values.
   * When provided, uses a single-wheel picker instead of the days+hours side-by-side wheels.
   * Useful for shorter duration contexts like focus timers.
   */
  optionsMinutes?: number[];
  /**
   * Text used by screen readers for the picker.
   */
  accessibilityLabel?: string;
  /**
   * iOS-only: height of the wheel container.
   */
  iosWheelHeight?: number;
  /**
   * Whether to show the helper text below the picker.
   * Defaults to true.
   */
  showHelperText?: boolean;
  /**
   * iOS-only: show subtle edge fades over the wheel to de-emphasize non-selected rows.
   * Defaults to true.
   */
  iosUseEdgeFades?: boolean;
};

export function DurationPicker({
  valueMinutes,
  onChangeMinutes,
  optionsMinutes,
  accessibilityLabel = 'Duration picker',
  iosWheelHeight = 210,
  showHelperText = true,
  iosUseEdgeFades = true,
}: DurationPickerProps) {
  // If custom options are provided, use single-wheel mode (for focus timers, etc.)
  const useSingleWheel = optionsMinutes != null && optionsMinutes.length > 0;

  if (useSingleWheel) {
    return (
      <SingleWheelPicker
        valueMinutes={valueMinutes}
        onChangeMinutes={onChangeMinutes}
        optionsMinutes={optionsMinutes!}
        accessibilityLabel={accessibilityLabel}
        iosWheelHeight={iosWheelHeight}
        showHelperText={showHelperText}
        iosUseEdgeFades={iosUseEdgeFades}
      />
    );
  }

  return (
    <DaysHoursWheelPicker
      valueMinutes={valueMinutes}
      onChangeMinutes={onChangeMinutes}
      accessibilityLabel={accessibilityLabel}
      iosWheelHeight={iosWheelHeight}
      showHelperText={showHelperText}
      iosUseEdgeFades={iosUseEdgeFades}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Days + Hours side-by-side wheel picker (default mode)
// ─────────────────────────────────────────────────────────────────────────────

function DaysHoursWheelPicker({
  valueMinutes,
  onChangeMinutes,
  accessibilityLabel,
  iosWheelHeight,
  showHelperText,
  iosUseEdgeFades,
}: Omit<DurationPickerProps, 'optionsMinutes'>) {
  // Convert total minutes to days and hours
  const totalMinutes = Math.max(0, Math.round(valueMinutes));
  const selectedDays = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const selectedHours = Math.floor((totalMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR);

  // Clamp to valid ranges
  const clampedDays = Math.min(Math.max(selectedDays, 0), 7);
  const clampedHours = Math.min(Math.max(selectedHours, 0), 23);

  const handleDaysChange = React.useCallback(
    (days: number) => {
      const newTotal = days * MINUTES_PER_DAY + clampedHours * MINUTES_PER_HOUR;
      onChangeMinutes(newTotal);
    },
    [clampedHours, onChangeMinutes],
  );

  const handleHoursChange = React.useCallback(
    (hours: number) => {
      const newTotal = clampedDays * MINUTES_PER_DAY + hours * MINUTES_PER_HOUR;
      onChangeMinutes(newTotal);
    },
    [clampedDays, onChangeMinutes],
  );

  const formatDayLabel = (d: number) => (d === 1 ? '1 day' : `${d} days`);
  const formatHourLabel = (h: number) => (h === 1 ? '1 hr' : `${h} hrs`);

  if (Platform.OS === 'ios') {
    const gradientHeight = Math.max(40, Math.min(56, Math.round(iosWheelHeight! * 0.27)));
    return (
      <View style={styles.iosWheelShell} accessibilityLabel={accessibilityLabel}>
        <View style={[styles.iosWheelFrame, { height: iosWheelHeight }]}>
          {/* Days wheel */}
          <View style={styles.wheelColumn}>
            <Picker
              selectedValue={clampedDays}
              onValueChange={(value) => handleDaysChange(Number(value))}
              itemStyle={styles.iosWheelItem}
            >
              {DEFAULT_DAY_OPTIONS.map((d) => (
                <Picker.Item key={`day-${d}`} label={formatDayLabel(d)} value={d} />
              ))}
            </Picker>
          </View>

          {/* Hours wheel */}
          <View style={styles.wheelColumn}>
            <Picker
              selectedValue={clampedHours}
              onValueChange={(value) => handleHoursChange(Number(value))}
              itemStyle={styles.iosWheelItem}
            >
              {DEFAULT_HOUR_OPTIONS.map((h) => (
                <Picker.Item key={`hr-${h}`} label={formatHourLabel(h)} value={h} />
              ))}
            </Picker>
          </View>

          {iosUseEdgeFades ? (
            <>
              <View pointerEvents="none" style={[styles.iosGradientTop, { height: gradientHeight }]}>
                <LinearGradient
                  colors={[colors.shell, 'rgba(0,0,0,0)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </View>
              <View pointerEvents="none" style={[styles.iosGradientBottom, { height: gradientHeight }]}>
                <LinearGradient
                  colors={['rgba(0,0,0,0)', colors.shell]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </View>
            </>
          ) : null}
        </View>
        {showHelperText ? (
          <Text style={styles.iosHelperText}>{formatDurationMinutes(totalMinutes)}</Text>
        ) : null}
      </View>
    );
  }

  // Android: two side-by-side pickers
  return (
    <View accessibilityLabel={accessibilityLabel}>
      <View style={styles.androidPickerRow}>
        <View style={[styles.androidPickerFrame, styles.androidPickerColumn]}>
          <Picker
            selectedValue={clampedDays}
            onValueChange={(value) => handleDaysChange(Number(value))}
            mode="dialog"
          >
            {DEFAULT_DAY_OPTIONS.map((d) => (
              <Picker.Item key={`day-${d}`} label={formatDayLabel(d)} value={d} />
            ))}
          </Picker>
        </View>
        <View style={[styles.androidPickerFrame, styles.androidPickerColumn]}>
          <Picker
            selectedValue={clampedHours}
            onValueChange={(value) => handleHoursChange(Number(value))}
            mode="dialog"
          >
            {DEFAULT_HOUR_OPTIONS.map((h) => (
              <Picker.Item key={`hr-${h}`} label={formatHourLabel(h)} value={h} />
            ))}
          </Picker>
        </View>
      </View>
      {showHelperText ? (
        <Text style={styles.androidHelperText}>{formatDurationMinutes(totalMinutes)}</Text>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single-wheel picker (legacy mode for focus timers with custom minute options)
// ─────────────────────────────────────────────────────────────────────────────

function SingleWheelPicker({
  valueMinutes,
  onChangeMinutes,
  optionsMinutes,
  accessibilityLabel,
  iosWheelHeight,
  showHelperText,
  iosUseEdgeFades,
}: Required<Pick<DurationPickerProps, 'optionsMinutes'>> & Omit<DurationPickerProps, 'optionsMinutes'>) {
  const options = React.useMemo(() => {
    const normalized = (optionsMinutes ?? [])
      .map((n) => Math.max(1, Math.round(n)))
      .filter((n) => Number.isFinite(n));
    const uniqueSorted = Array.from(new Set(normalized)).sort((a, b) => a - b);
    return uniqueSorted.length > 0 ? uniqueSorted : [15, 30, 45, 60];
  }, [optionsMinutes]);

  const selected =
    options.includes(valueMinutes) ? valueMinutes : options[Math.max(0, Math.min(options.length - 1, 1))] ?? 30;

  if (Platform.OS === 'ios') {
    const gradientHeight = Math.max(40, Math.min(56, Math.round(iosWheelHeight! * 0.27)));
    return (
      <View style={styles.iosWheelShell} accessibilityLabel={accessibilityLabel}>
        <View style={[styles.iosWheelFrameSingle, { height: iosWheelHeight }]}>
          <Picker
            selectedValue={selected}
            onValueChange={(value) => onChangeMinutes(Number(value))}
            itemStyle={styles.iosWheelItem}
          >
            {options.map((m) => (
              <Picker.Item key={String(m)} label={formatDurationMinutes(m)} value={m} />
            ))}
          </Picker>
          {iosUseEdgeFades ? (
            <>
              <View pointerEvents="none" style={[styles.iosGradientTop, { height: gradientHeight }]}>
                <LinearGradient
                  colors={[colors.shell, 'rgba(0,0,0,0)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </View>
              <View pointerEvents="none" style={[styles.iosGradientBottom, { height: gradientHeight }]}>
                <LinearGradient
                  colors={['rgba(0,0,0,0)', colors.shell]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </View>
            </>
          ) : null}
        </View>
        {showHelperText ? (
          <Text style={styles.iosHelperText}>{formatDurationMinutes(selected)}</Text>
        ) : null}
      </View>
    );
  }

  // Android: single picker
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
      {showHelperText ? (
        <Text style={styles.androidHelperText}>{formatDurationMinutes(selected)}</Text>
      ) : null}
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
    flexDirection: 'row',
    justifyContent: 'center',
  },
  iosWheelFrameSingle: {
    width: '100%',
    height: 210,
    justifyContent: 'center',
  },
  wheelColumn: {
    flex: 1,
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
  androidPickerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  androidPickerFrame: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
  },
  androidPickerColumn: {
    flex: 1,
  },
  androidHelperText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
