import { ActivityIndicator, Pressable, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { BottomDrawerFooter } from '../../ui/layout/BottomDrawerFooter';
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

type ActivityScheduleSheetProps = {
  visible: boolean;
  activityTitle: string;
  lensHeight: number;
  controller: ActivityScheduleSheetController;
  onOpenCalendarSettings: () => void;
  onOpenAvailabilitySettings: () => void;
};

export function ActivityScheduleSheet({
  visible,
  activityTitle,
  lensHeight,
  controller,
  onOpenCalendarSettings,
  onOpenAvailabilitySettings,
}: ActivityScheduleSheetProps) {
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
    selectedSlotIndex,
    selectedSlotLabel,
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

  return (
    <BottomDrawer
      visible={visible}
      onClose={close}
      snapPoints={['95%']}
      scrimToken="pineSubtle"
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
                <ActivityIndicator color={colors.textSecondary} />
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
                <Text style={styles.sheetSectionLabel}>
                  {slots.length > 0 ? 'Suggested times' : 'Pick a time'}
                </Text>
                {slots.length > 0 ? (
                  <HStack style={{ flexWrap: 'wrap', gap: spacing.sm }}>
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
                  </HStack>
                ) : null}
              </VStack>
            )}

            {writeRef ? (
              <View style={{ flex: 1, minHeight: 0, marginTop: spacing.sm }}>
                <View style={{ height: 72, marginBottom: spacing.xs }}>
                  <PlanDateStrip selectedDate={targetDate} onSelectDate={selectTargetDate} />
                </View>
                <View style={{ flex: 1, minHeight: Math.min(280, lensHeight) }}>
                  <PlanCalendarLensPage
                    contentPadding={0}
                    targetDayLabel={targetDayLabel}
                    targetDate={targetDate}
                    externalEvents={externalEvents}
                    calendarColorByRefKey={controller.calendarColorByRefKey}
                    proposedBlocks={
                      selectedSlot
                        ? [{
                            title: activityTitle,
                            start: new Date(selectedSlot.startDate),
                            end: new Date(selectedSlot.endDate),
                          }]
                        : []
                    }
                    kwiltBlocks={kwiltBlocks}
                    conflictActivityIds={[]}
                    calendarStatus="connected"
                    isLoadingExternal={loading}
                    onOpenCalendarSettings={() => {
                      close();
                      onOpenCalendarSettings();
                    }}
                    onMoveCommitment={() => undefined}
                    onPressEmptyTime={selectManualTime}
                  />
                </View>
              </View>
            ) : null}
          </VStack>
        </View>

        {writeRef ? (
          <BottomDrawerFooter
            showTopBorder
            paddingHorizontal={0}
            paddingTop={spacing.sm}
            paddingBottom={spacing.sm}
            backgroundColor={colors.canvas}
          >
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
                    ? `Schedule ${selectedSlotLabel}`
                    : 'Schedule'}
              </Text>
            </Button>
          </BottomDrawerFooter>
        ) : null}
      </View>
    </BottomDrawer>
  );
}
