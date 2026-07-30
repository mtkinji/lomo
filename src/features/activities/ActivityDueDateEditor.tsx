import React from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BottomDrawer, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { VStack } from '../../ui/primitives';
import { useAppStore } from '../../store/useAppStore';
import { SheetOption } from './ActivityCoachDrawer';
import { resolveInitialDueDateForPicker } from './activityDatePickerDefaults';
import { applyDueDateReminderPolicy } from './dueDateReminderPolicy';
import { styles } from './activitiesScreenStyles';

export type ActivityDueDateEditorHandle = {
  open: (activityId: string) => void;
};

export function useActivityDueDateEditor() {
  const ref = React.useRef<ActivityDueDateEditorHandle | null>(null);
  const open = React.useCallback((activityId: string) => ref.current?.open(activityId), []);
  return { ref, open };
}

export const ActivityDueDateEditor = React.forwardRef<ActivityDueDateEditorHandle>(
  function ActivityDueDateEditor(_, ref) {
    const activities = useAppStore((state) => state.activities);
    const updateActivity = useAppStore((state) => state.updateActivity);
    const [activityId, setActivityId] = React.useState<string | null>(null);
    const [pickerVisible, setPickerVisible] = React.useState(false);

    const activity = React.useMemo(
      () => activities.find((candidate) => candidate.id === activityId) ?? null,
      [activities, activityId],
    );

    const close = React.useCallback(() => {
      setActivityId(null);
      setPickerVisible(false);
    }, []);

    React.useImperativeHandle(
      ref,
      () => ({
        open: (nextActivityId) => {
          setActivityId(nextActivityId);
          setPickerVisible(false);
        },
      }),
      [],
    );

    const commit = React.useCallback(
      (nextScheduledDate: string | null) => {
        if (!activityId) return;
        const timestamp = new Date().toISOString();
        updateActivity(activityId, (current) => ({
          ...current,
          ...applyDueDateReminderPolicy({
            activity: current,
            nextScheduledDate,
            now: new Date(timestamp),
          }),
          updatedAt: timestamp,
        }));
        close();
      },
      [activityId, close, updateActivity],
    );

    const selectOffset = React.useCallback(
      (offsetDays: number) => {
        const date = new Date();
        date.setDate(date.getDate() + offsetDays);
        date.setHours(23, 0, 0, 0);
        commit(date.toISOString());
      },
      [commit],
    );

    const handlePickerChange = React.useCallback(
      (event: DateTimePickerEvent, selected?: Date) => {
        if (Platform.OS !== 'ios') setPickerVisible(false);
        if (!selected || event.type === 'dismissed') return;
        const next = new Date(selected);
        next.setHours(23, 0, 0, 0);
        commit(next.toISOString());
      },
      [commit],
    );

    return (
      <BottomDrawer
        visible={Boolean(activity)}
        onClose={close}
        snapPoints={Platform.OS === 'ios' ? ['45%', '92%'] : ['45%']}
        snapIndex={Platform.OS === 'ios' ? (pickerVisible ? 1 : 0) : 0}
        scrimToken="pineSubtle"
      >
        <BottomDrawerScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          <BottomDrawerHeader
            title="Due"
            variant="minimal"
            containerStyle={styles.sheetHeader}
            titleStyle={styles.sheetTitle}
          />
          <VStack space="sm">
            <SheetOption label="Today" onPress={() => selectOffset(0)} />
            <SheetOption label="Tomorrow" onPress={() => selectOffset(1)} />
            <SheetOption label="Next Week" onPress={() => selectOffset(7)} />
            <SheetOption label="Pick a date…" onPress={() => setPickerVisible(true)} />
            <SheetOption label="Clear due date" onPress={() => commit(null)} />
          </VStack>
          {pickerVisible && activity ? (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                value={resolveInitialDueDateForPicker({
                  scheduledDate: activity.scheduledDate,
                })}
                onChange={handlePickerChange}
              />
            </View>
          ) : null}
        </BottomDrawerScrollView>
      </BottomDrawer>
    );
  },
);
