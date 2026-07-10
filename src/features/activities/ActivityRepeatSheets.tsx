import { Platform, Pressable, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors } from '../../theme';
import { HapticsService } from '../../services/HapticsService';
import { BottomDrawer } from '../../ui/BottomDrawer';
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
};

function RepeatOption({ label, testID, onPress }: RepeatOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={() => {
        void HapticsService.trigger('canvas.selection');
        onPress();
      }}
      style={styles.sheetRow}
    >
      <Text style={styles.sheetRowLabel}>{label}</Text>
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
        snapPoints={Platform.OS === 'ios' ? ['62%'] : ['60%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.sheetContent}>
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
        </View>
      </BottomDrawer>
    </>
  );
}
