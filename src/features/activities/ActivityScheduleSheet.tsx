import { Pressable } from '@/src/ui/HapticPressable';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { HStack, VStack } from '../../ui/primitives';
import { Text } from '../../ui/Typography';
import { PlanCalendarLensPage } from '../plan/PlanCalendarLensPage';
import { PlanDateStrip } from '../plan/PlanDateStrip';
import { DurationPicker, formatDurationMinutes } from './DurationPicker';
import { styles } from './activityDetailStyles';
import type { ActivityScheduleSheetController } from './useActivityScheduleSheetController';
import { KwiltLoader } from '../../ui/KwiltLoader';
import type { ManualScheduleSlotAdvisory } from './activityScheduleSlots';

type ActivityScheduleSheetProps = {
  visible: boolean;
  activityTitle: string;
  lensHeight: number;
  controller: ActivityScheduleSheetController;
  onOpenCalendarSettings: () => void;
  onOpenAvailabilitySettings: () => void;
};

function advisoryCopy(advisories: ManualScheduleSlotAdvisory[]): string | null {
  const messages: string[] = [];
  if (advisories.includes('busy')) messages.push('Overlaps another calendar event');
  if (advisories.some((advisory) => advisory === 'day-disabled' || advisory === 'no-window')) {
    messages.push('Outside your usual planning days');
  } else if (advisories.includes('outside-window')) {
    messages.push('Outside your usual planning hours');
  }
  return messages.length > 0 ? `${messages.join('. ')}.` : null;
}

export function ActivityScheduleSheet({
  visible,
  activityTitle,
  lensHeight,
  controller,
  onOpenCalendarSettings,
  onOpenAvailabilitySettings,
}: ActivityScheduleSheetProps) {
  const [androidDatePickerVisible, setAndroidDatePickerVisible] = useState(false);
  const {
    bindingHealth,
    close,
    confirmSelectedSlot,
    durationExpanded,
    durationMinutes,
    durationOptions,
    externalEvents,
    horizonExhausted,
    isCommitting,
    kwiltBlocks,
    loading,
    selectedSlot,
    selectedSlotAdvisories,
    selectedSlotDraft,
    selectedSlotIndex,
    selectedSlotLabel,
    slotFocusRequestId,
    selectSlotDraft,
    selectManualTime,
    selectSuggestedSlot,
    selectTargetDate,
    setDurationExpanded,
    setDurationMinutes,
    slots,
    targetDate,
    targetDayLabel,
    writeRef,
  } = controller;
  const selectedAdvisoryCopy = advisoryCopy(selectedSlotAdvisories);
  const minimumDate = new Date();
  minimumDate.setHours(0, 0, 0, 0);

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') setAndroidDatePickerVisible(false);
    if (event.type === 'dismissed' || !date) return;
    selectTargetDate(date);
  };

  return (
    <BottomDrawer
      visible={visible}
      onClose={close}
      snapPoints={['95%']}
      scrimToken="pineSubtle"
      bottomAccessoryShowTopBorder
      bottomAccessory={writeRef ? (
        <Button
          variant="primary"
          fullWidth
          disabled={!selectedSlot || isCommitting}
          accessibilityLabel="Schedule selected to-do time"
          accessibilityState={{ disabled: !selectedSlot || isCommitting }}
          testID="e2e.activityDetail.schedule.confirm"
          style={!selectedSlot || isCommitting ? { opacity: 0.55 } : null}
          onPress={() => confirmSelectedSlot().catch(() => undefined)}
        >
          <Text style={[styles.sheetRowLabel, { color: colors.primaryForeground }]}>
            {isCommitting
              ? 'Scheduling...'
              : selectedSlotLabel
                ? `${selectedSlotAdvisories.length > 0 ? 'Schedule anyway' : 'Schedule'} ${selectedSlotLabel}`
                : 'Schedule'}
          </Text>
        </Button>
      ) : undefined}
    >
      <View style={[styles.sheetContent, styles.scheduleSheetContent]}>
        <View style={{ flex: 1, minHeight: 0 }}>
          <BottomDrawerHeader
            title="Schedule to-do"
            variant="withClose"
            onClose={close}
            containerStyle={styles.sheetHeader}
            titleStyle={styles.sheetTitle}
          />
          <Text style={styles.sheetDescription}>Adds a block to your Plan calendar.</Text>
          {bindingHealth && bindingHealth !== 'healthy' ? (
            <Text style={[styles.sheetDescription, { color: colors.warning, marginTop: spacing.sm }]}>
              Calendar binding is {bindingHealth}. Kwilt may not be able to move or unschedule this block until calendar access is restored.
            </Text>
          ) : null}

          <VStack space="md" style={{ flex: 1, minHeight: 0 }}>
            <VStack space="sm">
              <HStack justifyContent="space-between" alignItems="center">
                <Text style={styles.sheetSectionLabel}>Duration</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit scheduling duration"
                  onPress={() => setDurationExpanded((current) => !current)}
                  style={({ pressed }) => [
                    styles.scheduleDurationChip,
                    pressed ? styles.scheduleDurationChipPressed : null,
                  ]}
                >
                  <Text style={styles.scheduleDurationChipText}>
                    {formatDurationMinutes(durationMinutes)}
                  </Text>
                </Pressable>
              </HStack>
              {durationExpanded ? (
                <View style={styles.scheduleDurationPicker}>
                  <View style={styles.scheduleDurationCard}>
                    <DurationPicker
                      valueMinutes={durationMinutes}
                      onChangeMinutes={setDurationMinutes}
                      optionsMinutes={durationOptions}
                      accessibilityLabel="Select scheduling duration"
                      iosWheelHeight={180}
                      showHelperText={false}
                      iosUseEdgeFades={false}
                    />
                  </View>
                </View>
              ) : null}
            </VStack>

            {loading ? (
              <HStack alignItems="center" space="sm">
                <KwiltLoader color={colors.textSecondary} />
                <Text style={styles.sheetDescription}>Finding slots...</Text>
              </HStack>
            ) : !writeRef ? (
              <VStack space="sm">
                <Text style={styles.sheetDescription}>Set a Plan write calendar to schedule.</Text>
                <Button
                  variant="primary"
                  fullWidth
                  onPress={() => {
                    close();
                    onOpenCalendarSettings();
                  }}
                >
                  Open Plan Calendars
                </Button>
              </VStack>
            ) : slots.length === 0 && !selectedSlot ? (
              <View style={styles.scheduleEmptyStateCard}>
                <HStack space="sm" alignItems="flex-start">
                  <View style={styles.scheduleEmptyStateIconWrap}>
                    <Icon name="calendar" size={16} color={colors.textSecondary} />
                  </View>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.scheduleEmptyStateTitle}>
                      {horizonExhausted
                        ? 'No available time in the next 2 weeks'
                        : 'No suggested times for this day'}
                    </Text>
                    <Text style={styles.scheduleEmptyStateBody}>
                      Tap the calendar below to pick a time or adjust availability.
                    </Text>
                    <View style={styles.scheduleEmptyStateActionRow}>
                      <Button
                        variant="secondary"
                        fullWidth
                        onPress={() => {
                          close();
                          onOpenAvailabilitySettings();
                        }}
                      >
                        Adjust availability
                      </Button>
                    </View>
                  </VStack>
                </HStack>
              </View>
            ) : (
              <VStack space="sm">
                <Text style={styles.sheetSectionLabel}>{slots.length > 0 ? 'Good fits' : 'Pick a time'}</Text>
                {slots.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scheduleSuggestionRail}
                  >
                    {slots.map((slot, index) => {
                      const start = new Date(slot.startDate);
                      const end = new Date(slot.endDate);
                      const label = `${start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}–${end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
                      return (
                        <Button
                          key={`${slot.startDate}:${index}`}
                          variant={index === selectedSlotIndex ? 'primary' : 'secondary'}
                          size="sm"
                          onPress={() => selectSuggestedSlot(index)}
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </ScrollView>
                ) : null}
              </VStack>
            )}

            {writeRef ? (
              <View style={{ flex: 1, minHeight: 0, marginTop: spacing.sm }}>
                <HStack justifyContent="space-between" alignItems="center" style={styles.scheduleDateControlRow}>
                  <Text style={styles.scheduleSelectedDayLabel}>Date</Text>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker
                      value={targetDate}
                      mode="date"
                      display="compact"
                      minimumDate={minimumDate}
                      onChange={handleDateChange}
                      accessibilityLabel="Choose any scheduling date"
                    />
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Choose any scheduling date"
                      onPress={() => setAndroidDatePickerVisible(true)}
                      style={({ pressed }) => [
                        styles.scheduleDatePickerButton,
                        pressed ? styles.scheduleDurationChipPressed : null,
                      ]}
                    >
                      <Icon name="calendar" size={16} color={colors.textPrimary} />
                      <Text style={styles.scheduleDatePickerButtonText}>{targetDayLabel}</Text>
                    </Pressable>
                  )}
                </HStack>
                {androidDatePickerVisible ? (
                  <DateTimePicker
                    value={targetDate}
                    mode="date"
                    display="default"
                    minimumDate={minimumDate}
                    onChange={handleDateChange}
                  />
                ) : null}
                <View style={{ height: 72, marginBottom: spacing.xs }}>
                  <PlanDateStrip selectedDate={targetDate} onSelectDate={selectTargetDate} />
                </View>
                <Text style={styles.schedulePlacementHint}>
                  {!selectedSlotDraft
                    ? 'Tap any time below to place this to-do.'
                    : selectedSlotIndex >= 0
                      ? 'Next open time is placed below. Drag the block or tap anywhere to move it.'
                      : 'Drag the block or either handle to adjust it.'}
                </Text>
                {selectedAdvisoryCopy ? (
                  <Text accessibilityLiveRegion="polite" style={styles.scheduleAdvisoryText}>
                    {selectedAdvisoryCopy}
                  </Text>
                ) : null}
                <View style={{ flex: 1, minHeight: Math.min(280, lensHeight) }}>
                  <PlanCalendarLensPage
                    contentPadding={0}
                    targetDayLabel={targetDayLabel}
                    targetDate={targetDate}
                    externalEvents={externalEvents}
                    calendarColorByRefKey={controller.calendarColorByRefKey}
                    proposedBlocks={[]}
                    slotDraft={selectedSlotDraft}
                    slotDraftTitle={activityTitle}
                    slotFocusRequestId={slotFocusRequestId}
                    kwiltBlocks={kwiltBlocks}
                    conflictActivityIds={[]}
                    calendarStatus="connected"
                    isLoadingExternal={loading}
                    onOpenCalendarSettings={() => {
                      close();
                      onOpenCalendarSettings();
                    }}
                    onPressEmptyTime={selectManualTime}
                    onSlotDraftChange={(draft) => {
                      if (draft) selectSlotDraft(draft);
                    }}
                    onSlotDraftComplete={selectSlotDraft}
                  />
                </View>
              </View>
            ) : null}
          </VStack>
        </View>
      </View>
    </BottomDrawer>
  );
}
