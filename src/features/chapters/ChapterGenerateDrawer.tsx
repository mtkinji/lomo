import React from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BottomDrawer, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { BottomDrawerHeader, BottomDrawerHeaderClose } from '../../ui/layout/BottomDrawerHeader';
import { Button } from '../../ui/Button';
import { HStack, Text, VStack } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';
import { Icon } from '../../ui/Icon';
import { SegmentedControl } from '../../ui/SegmentedControl';

export type ChapterPeriodChoice = 'lastComplete' | 'prev1' | 'prev3' | 'custom';
export type ChapterCadenceChoice = 'weekly' | 'monthly' | 'yearly' | 'manual';

export function ChapterGenerateDrawer(props: {
  visible: boolean;
  onClose: () => void;
  cadence: ChapterCadenceChoice;
  onChangeCadence: (choice: ChapterCadenceChoice) => void;
  periodChoice: ChapterPeriodChoice;
  onChangePeriodChoice: (choice: ChapterPeriodChoice) => void;
  manualRangeEnabled: boolean;
  manualStartDate: Date;
  manualEndDate: Date;
  onChangeManualStartDate: (d: Date) => void;
  onChangeManualEndDate: (d: Date) => void;
  overwrite: boolean;
  onChangeOverwrite: (next: boolean) => void;
  onPressGenerate: () => void;
  generating: boolean;
}) {
  const {
    visible,
    onClose,
    cadence,
    onChangeCadence,
    periodChoice,
    onChangePeriodChoice,
    manualRangeEnabled,
    manualStartDate,
    manualEndDate,
    onChangeManualStartDate,
    onChangeManualEndDate,
    overwrite,
    onChangeOverwrite,
    onPressGenerate,
    generating,
  } = props;

  const [pickingStart, setPickingStart] = React.useState(false);
  const [pickingEnd, setPickingEnd] = React.useState(false);

  const periodOptions: Array<{
    key: ChapterPeriodChoice;
    title: string;
    description: string;
    disabled?: boolean;
  }> =
    cadence === 'manual'
      ? [
          {
            key: 'custom',
            title: 'Custom range',
            description: 'Pick a start and end date (up to 365 days).',
            disabled: !manualRangeEnabled,
          },
        ]
      : cadence === 'yearly'
      ? [
          { key: 'lastComplete', title: 'Last completed year', description: 'Recommended default.' },
          { key: 'prev1', title: 'Year before last', description: 'One more step back.' },
          { key: 'custom', title: 'Custom range', description: manualRangeEnabled ? 'Pick any range (up to 365 days).' : 'Coming next.', disabled: !manualRangeEnabled },
        ]
      : cadence === 'monthly'
        ? [
            { key: 'lastComplete', title: 'Last completed month', description: 'Recommended default.' },
            { key: 'prev1', title: 'Month before last', description: 'One more step back.' },
            { key: 'custom', title: 'Custom range', description: manualRangeEnabled ? 'Pick any range (up to 365 days).' : 'Coming next.', disabled: !manualRangeEnabled },
          ]
      : [
          { key: 'lastComplete', title: 'Last completed week', description: 'Recommended default.' },
          { key: 'prev1', title: 'Week before last', description: 'One more step back.' },
          { key: 'prev3', title: '4 weeks ago', description: 'A slightly longer lookback.' },
          { key: 'custom', title: 'Custom range', description: manualRangeEnabled ? 'Pick any range (up to 365 days).' : 'Coming next.', disabled: !manualRangeEnabled },
        ];

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['70%', '92%']}
      enableContentPanningGesture
    >
      <BottomDrawerHeader
        variant="withClose"
        title="Generate Chapter"
        onClose={onClose}
      />

      <BottomDrawerScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <VStack space="lg">
          <VStack space="sm">
            <Text style={styles.sectionTitle}>Cadence</Text>
            <SegmentedControl
              value={cadence}
              onChange={onChangeCadence}
              options={[
                { value: 'weekly', label: 'Week' },
                { value: 'monthly', label: 'Month' },
                { value: 'yearly', label: 'Year' },
                { value: 'manual', label: 'Custom' },
              ]}
            />
          </VStack>
          <VStack space="sm">
            <Text style={styles.sectionTitle}>Time period</Text>
            <VStack space="xs">
              {periodOptions.map((opt) => {
                const selected = opt.key === periodChoice;
                const disabled = Boolean(opt.disabled);
                return (
                  <Pressable
                    key={opt.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled }}
                    onPress={() => {
                      if (disabled) return;
                      onChangePeriodChoice(opt.key);
                    }}
                    style={[
                      styles.optionRow,
                      selected && styles.optionRowSelected,
                      disabled && styles.optionRowDisabled,
                    ]}
                  >
                    <HStack space="sm" alignItems="center" style={styles.optionRowInner}>
                      <Icon
                        name={selected ? 'checkCircle' : 'dot'}
                        size={20}
                        color={selected ? colors.pine700 : colors.border}
                      />
                      <View style={styles.optionTextCol}>
                        <Text style={styles.optionTitle}>{opt.title}</Text>
                        <Text style={styles.optionDesc}>{opt.description}</Text>
                      </View>
                    </HStack>
                  </Pressable>
                );
              })}
            </VStack>
          </VStack>

          {periodChoice === 'custom' ? (
            <VStack space="sm">
              <Text style={styles.sectionTitle}>Custom range</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !manualRangeEnabled }}
                onPress={() => {
                  if (!manualRangeEnabled) return;
                  setPickingStart(true);
                  setPickingEnd(false);
                }}
                style={[styles.optionRow, !manualRangeEnabled && styles.optionRowDisabled]}
              >
                <VStack space="xs">
                  <Text style={styles.optionTitle}>Start date</Text>
                  <Text style={styles.optionDesc}>
                    {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
                      manualStartDate,
                    )}
                  </Text>
                </VStack>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !manualRangeEnabled }}
                onPress={() => {
                  if (!manualRangeEnabled) return;
                  setPickingEnd(true);
                  setPickingStart(false);
                }}
                style={[styles.optionRow, !manualRangeEnabled && styles.optionRowDisabled]}
              >
                <VStack space="xs">
                  <Text style={styles.optionTitle}>End date (exclusive)</Text>
                  <Text style={styles.optionDesc}>
                    {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
                      manualEndDate,
                    )}
                  </Text>
                </VStack>
              </Pressable>

              {Platform.OS === 'ios' && (pickingStart || pickingEnd) ? (
                <View style={styles.pickerWrap}>
                  <DateTimePicker
                    value={pickingStart ? manualStartDate : manualEndDate}
                    mode="date"
                    display="spinner"
                    onChange={(_ev: DateTimePickerEvent, date?: Date) => {
                      if (!date) return;
                      if (pickingStart) onChangeManualStartDate(date);
                      else onChangeManualEndDate(date);
                    }}
                  />
                </View>
              ) : null}

              {Platform.OS !== 'ios' && pickingStart ? (
                <DateTimePicker
                  value={manualStartDate}
                  mode="date"
                  onChange={(_ev: DateTimePickerEvent, date?: Date) => {
                    setPickingStart(false);
                    if (!date) return;
                    onChangeManualStartDate(date);
                  }}
                />
              ) : null}

              {Platform.OS !== 'ios' && pickingEnd ? (
                <DateTimePicker
                  value={manualEndDate}
                  mode="date"
                  onChange={(_ev: DateTimePickerEvent, date?: Date) => {
                    setPickingEnd(false);
                    if (!date) return;
                    onChangeManualEndDate(date);
                  }}
                />
              ) : null}
            </VStack>
          ) : null}

          <HStack style={styles.toggleRow} space="sm" alignItems="center">
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Overwrite existing Chapter</Text>
              <Text style={styles.optionDesc}>If one already exists for that period, regenerate it.</Text>
            </View>
            <Switch value={overwrite} onValueChange={onChangeOverwrite} />
          </HStack>

          <Button
            variant="accent"
            disabled={generating}
            onPress={onPressGenerate}
            accessibilityLabel="Generate Chapter"
          >
            {generating ? 'Generating…' : 'Generate'}
          </Button>
        </VStack>
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textSecondary,
  },
  optionRow: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  optionRowSelected: {
    borderColor: colors.pine400,
  },
  optionRowDisabled: {
    opacity: 0.55,
  },
  optionRowInner: {
    width: '100%',
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },
  optionDesc: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toggleRow: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pickerWrap: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});


