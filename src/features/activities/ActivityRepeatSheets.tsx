import { Pressable } from '@/src/ui/HapticPressable';
import { Platform, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, spacing } from '../../theme';
import type { ActivityMonthlyWeekday } from '../../domain/types';
import { HapticsService } from '../../services/HapticsService';
import { BottomDrawer, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { Icon } from '../../ui/Icon';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { HStack, VStack } from '../../ui/primitives';
import { Text } from '../../ui/Typography';
import { NumberWheelPicker } from '../../ui/NumberWheelPicker';
import { RepeatInfoMenu } from './RepeatInfoMenu';
import { styles } from './activityDetailStyles';
import type { ActivityRepeatEditorController } from './useActivityRepeatEditor';

type ActivityRepeatSheetsProps = {
  presetVisible: boolean;
  customVisible: boolean;
  controller: ActivityRepeatEditorController;
};

type RepeatOptionProps = {
  label: string;
  testID: string;
  onPress: () => void;
  selected?: boolean;
};

function RepeatOption({ label, testID, onPress, selected }: RepeatOptionProps) {
  return (
    <Pressable
      accessibilityRole={selected === undefined ? "button" : "radio"}
      accessibilityState={selected === undefined ? undefined : { checked: selected }}
      testID={testID}
      onPress={() => {
        void HapticsService.trigger('canvas.selection');
        onPress();
      }}
      style={[styles.sheetRow, { minHeight: 44, justifyContent: 'center' }]}
    >
      <HStack alignItems="center" justifyContent="space-between" style={{ width: '100%' }}>
        <Text style={[styles.sheetRowLabel, { flexShrink: 1 }]}>{label}</Text>
        {selected ? <Icon name="check" size={20} color={colors.textPrimary} /> : null}
      </HStack>
    </Pressable>
  );
}

export function ActivityRepeatSheets({
  presetVisible,
  customVisible,
  controller,
}: ActivityRepeatSheetsProps) {
  const cadenceMax = controller.cadence === 'days'
    ? 30
    : controller.cadence === 'weeks'
      ? 12
      : controller.cadence === 'months'
        ? 24
        : 10;

  return (
    <>
      <BottomDrawer
        visible={presetVisible}
        onClose={controller.close}
        snapPoints={['60%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.sheetContent}>
          <BottomDrawerHeader
            title="Repeat"
            rightAction={<RepeatInfoMenu />}
            containerStyle={styles.sheetHeader}
            titleStyle={styles.sheetTitle}
          />
          <VStack space="sm">
            <RepeatOption testID="e2e.activityDetail.repeat.daily" label="Daily" onPress={() => controller.selectPreset('daily')} />
            <RepeatOption testID="e2e.activityDetail.repeat.weekly" label="Weekly" onPress={() => controller.selectPreset('weekly')} />
            <RepeatOption testID="e2e.activityDetail.repeat.weekdays" label="Weekdays" onPress={() => controller.selectPreset('weekdays')} />
            <RepeatOption testID="e2e.activityDetail.repeat.monthly" label="Monthly" onPress={() => controller.selectPreset('monthly')} />
            <RepeatOption testID="e2e.activityDetail.repeat.yearly" label="Yearly" onPress={() => controller.selectPreset('yearly')} />
            <RepeatOption testID="e2e.activityDetail.repeat.custom" label="Custom..." onPress={controller.openCustom} />
            <RepeatOption testID="e2e.activityDetail.repeat.clear" label="Off" onPress={controller.clear} />
          </VStack>
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={customVisible}
        onClose={controller.close}
        snapPoints={controller.cadence === 'months' && controller.setMonthlyWeekday ? ['90%'] : Platform.OS === 'ios' ? ['62%'] : ['60%']}
        scrimToken="pineSubtle"
      >
        <BottomDrawerScrollView contentContainerStyle={[styles.sheetContent, { flex: 0, flexGrow: 1, paddingBottom: spacing.xl }]} showsVerticalScrollIndicator={false}>
          <HStack alignItems="center" justifyContent="space-between" style={styles.customRepeatHeaderRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to repeat options"
              testID="e2e.activityDetail.customRepeat.back"
              onPress={controller.returnToPresets}
              hitSlop={8}
            >
              <Icon name="arrowLeft" size={18} color={colors.textSecondary} />
            </Pressable>
            <Text style={styles.customRepeatHeaderTitle}>Repeat every...</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Set custom repeat rule"
              testID="e2e.activityDetail.customRepeat.set"
              onPress={controller.commitCustom}
              hitSlop={8}
            >
              <Text style={styles.customRepeatSetLabel}>Set</Text>
            </Pressable>
          </HStack>

          <View style={styles.customRepeatPickerBlock}>
            <HStack space="md" alignItems="center" justifyContent="center">
              {Platform.OS === 'ios' ? (
                <>
                  <View style={styles.iosWheelFrame}>
                    <Picker
                      selectedValue={controller.interval}
                      onValueChange={(value) => controller.setInterval(Number(value))}
                      itemStyle={styles.iosWheelItem}
                    >
                      {Array.from({ length: cadenceMax }, (_, index) => index + 1).map((value) => (
                        <Picker.Item key={String(value)} label={String(value)} value={value} />
                      ))}
                    </Picker>
                  </View>
                  <View style={styles.iosWheelFrame}>
                    <Picker
                      selectedValue={controller.cadence}
                      onValueChange={controller.setCadence}
                      itemStyle={styles.iosWheelItem}
                    >
                      <Picker.Item label="Days" value="days" />
                      <Picker.Item label="Weeks" value="weeks" />
                      <Picker.Item label="Months" value="months" />
                      <Picker.Item label="Years" value="years" />
                    </Picker>
                  </View>
                </>
              ) : (
                <>
                  <NumberWheelPicker
                    value={controller.interval}
                    onChange={controller.setInterval}
                    min={1}
                    max={cadenceMax}
                  />
                  <NumberWheelPicker
                    value={['days', 'weeks', 'months', 'years'].indexOf(controller.cadence)}
                    onChange={(index) => {
                      const cadence = (['days', 'weeks', 'months', 'years'] as const)[index] ?? 'weeks';
                      controller.setCadence(cadence);
                    }}
                    min={0}
                    max={3}
                    formatLabel={(index) => (['Days', 'Weeks', 'Months', 'Years'] as const)[index] ?? 'Weeks'}
                  />
                </>
              )}
            </HStack>
          </View>

          {controller.cadence === 'months' && controller.setMonthlyWeekday ? <MonthlyRepeatOptions controller={controller} /> : null}

          {controller.cadence === 'weeks' ? (
            <>
              <Text style={styles.customRepeatSectionLabel}>Repeat on</Text>
              <HStack space="sm" alignItems="center" style={styles.customRepeatWeekdayRow}>
                {(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const).map((label, index) => {
                  const selected = controller.weekdays.includes(index);
                  return (
                    <Pressable
                      key={label}
                      accessibilityRole="button"
                      accessibilityLabel={`Toggle ${label}`}
                      onPress={() => controller.toggleWeekday(index)}
                      style={[
                        styles.customRepeatWeekdayChip,
                        selected && styles.customRepeatWeekdayChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.customRepeatWeekdayChipText,
                          selected && styles.customRepeatWeekdayChipTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </HStack>
            </>
          ) : null}
        </BottomDrawerScrollView>
      </BottomDrawer>
    </>
  );
}


const MONTH_ORDINALS = [1, 2, 3, 4, 5, -1] as const;
const MONTH_ORDINAL_LABELS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Last'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function MonthlyRepeatOptions({ controller }: { controller: ActivityRepeatEditorController }) {
  const pattern = controller.monthlyWeekday;
  const update = (patch: Partial<ActivityMonthlyWeekday>) => controller.setMonthlyWeekday?.({
    ordinal: pattern?.ordinal ?? 1,
    weekday: pattern?.weekday ?? new Date().getDay(),
    ...patch,
  });
  return (
    <VStack space="sm">
      <RepeatOption label="Same day each month" testID="e2e.activityDetail.customRepeat.month.date" selected={!pattern} onPress={() => controller.setMonthlyWeekday?.(undefined)} />
      <RepeatOption label="Same week each month" testID="e2e.activityDetail.customRepeat.month.week" selected={Boolean(pattern)} onPress={() => update({})} />
      {pattern ? (
        <>
          <HStack space="sm" alignItems="center" justifyContent="center">
            {Platform.OS === 'ios' ? (
              <>
                <Picker
                  style={{ flex: 1 }}
                  accessibilityLabel="Week of month"
                  testID="e2e.activityDetail.customRepeat.month.ordinal"
                  selectedValue={pattern.ordinal}
                  onValueChange={(value) => update({ ordinal: Number(value) as ActivityMonthlyWeekday['ordinal'] })}
                  itemStyle={styles.iosWheelItem}
                >
                  {MONTH_ORDINALS.map((value, index) => <Picker.Item key={value} label={MONTH_ORDINAL_LABELS[index]} value={value} />)}
                </Picker>
                <Picker
                  style={{ flex: 1 }}
                  accessibilityLabel="Day of week"
                  testID="e2e.activityDetail.customRepeat.month.weekday"
                  selectedValue={pattern.weekday}
                  onValueChange={(value) => update({ weekday: Number(value) })}
                  itemStyle={styles.iosWheelItem}
                >
                  {WEEKDAY_NAMES.map((label, value) => <Picker.Item key={value} label={label} value={value} />)}
                </Picker>
              </>
            ) : (
              <>
                <NumberWheelPicker value={MONTH_ORDINALS.indexOf(pattern.ordinal)} onChange={(index) => update({ ordinal: MONTH_ORDINALS[index] })} min={0} max={5} formatLabel={(index) => MONTH_ORDINAL_LABELS[index]} />
                <NumberWheelPicker value={pattern.weekday} onChange={(weekday) => update({ weekday })} min={0} max={6} formatLabel={(index) => WEEKDAY_NAMES[index]} />
              </>
            )}
          </HStack>
          {pattern.ordinal === 5 ? <Text variant="bodySm" style={{ color: colors.textSecondary }}>Months without a fifth {WEEKDAY_NAMES[pattern.weekday]} are skipped.</Text> : null}
        </>
      ) : null}
    </VStack>
  );
}
