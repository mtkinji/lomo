import React from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { VStack, Text } from '../../ui/primitives';
import { BottomDrawer, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { SheetOption } from './ActivityCoachDrawer';
import { styles } from './activitiesScreenStyles';

export type QuickAddReminderSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSetReminderByOffset: (offsetMinutes: number) => void;
  onClearReminder: () => void;
};

export function QuickAddReminderSheet({
  visible,
  onClose,
  onSetReminderByOffset,
  onClearReminder,
}: QuickAddReminderSheetProps) {
  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['40%']}
      presentation="inline"
      hideBackdrop
    >
      <View style={styles.sheetContent}>
        <Text style={styles.sheetTitle}>Reminder</Text>
        <VStack space="sm">
          <SheetOption label="In 1 hour" onPress={() => onSetReminderByOffset(60)} />
          <SheetOption label="This evening" onPress={() => onSetReminderByOffset(60 * 6)} />
          <SheetOption label="Tomorrow morning" onPress={() => onSetReminderByOffset(60 * 18)} />
          <SheetOption label="Clear reminder" onPress={onClearReminder} />
        </VStack>
      </View>
    </BottomDrawer>
  );
}

export type QuickAddDueDateSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSetDueDateByOffset: (offsetDays: number) => void;
  onClearDueDate: () => void;
  isDatePickerVisible: boolean;
  onToggleDatePicker: (show: boolean) => void;
  getInitialDateForPicker: () => Date;
  onDateChange: (event: any, selectedDate?: Date) => void;
};

export function QuickAddDueDateSheet({
  visible,
  onClose,
  onSetDueDateByOffset,
  onClearDueDate,
  isDatePickerVisible,
  onToggleDatePicker,
  getInitialDateForPicker,
  onDateChange,
}: QuickAddDueDateSheetProps) {
  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      // iOS inline date picker needs more vertical space; otherwise it renders below the fold.
      // Use a two-stage sheet and auto-expand when picker opens.
      snapPoints={Platform.OS === 'ios' ? ['45%', '92%'] : ['45%']}
      snapIndex={Platform.OS === 'ios' ? (isDatePickerVisible ? 1 : 0) : 0}
      presentation="inline"
      hideBackdrop
    >
      <BottomDrawerScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sheetTitle}>Due</Text>
        <VStack space="sm">
          <SheetOption label="Today" onPress={() => onSetDueDateByOffset(0)} />
          <SheetOption label="Tomorrow" onPress={() => onSetDueDateByOffset(1)} />
          <SheetOption label="Next Week" onPress={() => onSetDueDateByOffset(7)} />
          <SheetOption label="Pick a date…" onPress={() => onToggleDatePicker(true)} />
          <SheetOption label="Clear due date" onPress={onClearDueDate} />
        </VStack>
        {isDatePickerVisible && (
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              value={getInitialDateForPicker()}
              onChange={onDateChange}
            />
          </View>
        )}
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

export type QuickAddRepeatSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelectRepeat: (repeat: 'daily' | 'weekly' | 'weekdays' | 'monthly' | 'yearly') => void;
  onClearRepeat: () => void;
};

export function QuickAddRepeatSheet({
  visible,
  onClose,
  onSelectRepeat,
  onClearRepeat,
}: QuickAddRepeatSheetProps) {
  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['45%']}
      presentation="inline"
      hideBackdrop
    >
      <View style={styles.sheetContent}>
        <Text style={styles.sheetTitle}>Repeat</Text>
        <VStack space="sm">
          <SheetOption label="Daily" onPress={() => onSelectRepeat('daily')} />
          <SheetOption label="Weekly" onPress={() => onSelectRepeat('weekly')} />
          <SheetOption label="Weekdays" onPress={() => onSelectRepeat('weekdays')} />
          <SheetOption label="Monthly" onPress={() => onSelectRepeat('monthly')} />
          <SheetOption label="Yearly" onPress={() => onSelectRepeat('yearly')} />
          <SheetOption label="Off" onPress={onClearRepeat} />
        </VStack>
      </View>
    </BottomDrawer>
  );
}

export type QuickAddEstimateSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelectEstimate: (minutes: number | null) => void;
};

export function QuickAddEstimateSheet({
  visible,
  onClose,
  onSelectEstimate,
}: QuickAddEstimateSheetProps) {
  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['45%']}
      presentation="inline"
      hideBackdrop
    >
      <View style={styles.sheetContent}>
        <Text style={styles.sheetTitle}>Estimate</Text>
        <VStack space="sm">
          <SheetOption label="10 min" onPress={() => onSelectEstimate(10)} />
          <SheetOption label="20 min" onPress={() => onSelectEstimate(20)} />
          <SheetOption label="30 min" onPress={() => onSelectEstimate(30)} />
          <SheetOption label="45 min" onPress={() => onSelectEstimate(45)} />
          <SheetOption label="60 min" onPress={() => onSelectEstimate(60)} />
          <SheetOption label="Clear estimate" onPress={() => onSelectEstimate(null)} />
        </VStack>
      </View>
    </BottomDrawer>
  );
}

