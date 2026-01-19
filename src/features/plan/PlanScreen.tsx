import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { PlanPager } from './PlanPager';
import { HStack, Text } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';
import { formatDayLabel } from '../../services/plan/planDates';
import { Icon } from '../../ui/Icon';
import { Combobox, type ComboboxOption } from '../../ui/Combobox';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { IconButton } from '../../ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/DropdownMenu';
export function PlanScreen() {
  const navigation = useNavigation();
  const drawerOpen = useDrawerStatus() === 'open';
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [androidPickerVisible, setAndroidPickerVisible] = useState(false);
  const [iosDateDialogVisible, setIosDateDialogVisible] = useState(false);
  const [pendingDate, setPendingDate] = useState(() => new Date());
  const [selectionMode, setSelectionMode] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [activePageIndex, setActivePageIndex] = useState(0);

  const handleSelectToday = () => {
    const now = new Date();
    setSelectedDate(now);
    setSelectionMode('today');
    setAndroidPickerVisible(false);
    setIosDateDialogVisible(false);
  };

  const handleSelectTomorrow = () => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
    setSelectionMode('tomorrow');
    setAndroidPickerVisible(false);
    setIosDateDialogVisible(false);
  };

  const openCustomDatePicker = () => {
    setSelectionMode('custom');
    if (Platform.OS === 'ios') {
      setPendingDate(selectedDate);
      setIosDateDialogVisible(true);
      setAndroidPickerVisible(false);
    } else {
      setAndroidPickerVisible(true);
      setIosDateDialogVisible(false);
    }
  };

  const handleAndroidDateChange = (event: DateTimePickerEvent, date?: Date) => {
    const eventType = (event as unknown as { type?: string })?.type;
    if (eventType === 'dismissed') {
      setAndroidPickerVisible(false);
      return;
    }
    if (date) {
      setSelectedDate(date);
      setSelectionMode('custom');
      setAndroidPickerVisible(false);
    }
  };

  const handleIosPendingDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) {
      setPendingDate(date);
    }
  };

  const selectedLabel = useMemo(() => {
    if (selectionMode === 'today') return 'Today';
    if (selectionMode === 'tomorrow') return 'Tomorrow';
    return formatDayLabel(selectedDate);
  }, [selectedDate, selectionMode]);

  const dateOptions = useMemo(() => {
    const options: ComboboxOption[] = [
      { value: 'today', label: 'Today' },
      { value: 'tomorrow', label: 'Tomorrow' },
    ];
    if (selectionMode === 'custom') {
      options.push({ value: 'custom', label: formatDayLabel(selectedDate) });
    }
    options.push({ value: 'pick', label: 'Pick date…' });
    return options;
  }, [selectedDate, selectionMode]);

  const comboboxValue = selectionMode === 'custom' ? 'custom' : selectionMode;

  const handleComboboxValueChange = (next: string) => {
    if (next === 'pick') {
      openCustomDatePicker();
      return;
    }
    if (next === 'today') {
      handleSelectToday();
      return;
    }
    if (next === 'tomorrow') {
      handleSelectTomorrow();
      return;
    }
    if (next === 'custom') {
      setSelectionMode('custom');
      return;
    }
  };

  return (
    <AppShell>
      <View style={styles.container}>
        <PageHeader
          title="Plan"
          menuOpen={drawerOpen}
          onPressMenu={() => {
            navigation.dispatch(DrawerActions.openDrawer());
          }}
          rightElement={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton
                  accessibilityLabel="Plan settings"
                  style={styles.headerMoreButton}
                  onPress={() => {
                    // handled by DropdownMenuTrigger
                  }}
                >
                  <Icon name="more" size={20} color={colors.textPrimary} />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom">
                <DropdownMenuItem
                  onSelect={() => {
                    (navigation as any).navigate('Settings', { screen: 'SettingsPlanCalendars' } as any);
                  }}
                >
                  <Text style={styles.menuItemText}>Manage calendars</Text>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    (navigation as any).navigate('Settings', { screen: 'SettingsPlanAvailability' } as any);
                  }}
                >
                  <Text style={styles.menuItemText}>Set availability</Text>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
          children={
            <HStack alignItems="center" justifyContent="space-between" style={styles.headerControlsRow}>
              <SegmentedControl
                value={activePageIndex === 0 ? 'recs' : 'calendar'}
                onChange={(v) => {
                  setActivePageIndex(v === 'recs' ? 0 : 1);
                }}
                size="compact"
                options={[
                  { value: 'recs', label: 'Recommendations' },
                  { value: 'calendar', label: 'Calendar' },
                ]}
              />
              <Combobox
                open={dateMenuOpen}
                onOpenChange={setDateMenuOpen}
                value={comboboxValue}
                onValueChange={handleComboboxValueChange}
                options={dateOptions}
                allowDeselect={false}
                showSearch={false}
                presentation="popover"
                trigger={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Select plan date"
                    style={styles.headerDateTrigger}
                  >
                    <HStack space={spacing.xs} alignItems="center">
                      <Text style={styles.headerDateTriggerText}>{selectedLabel}</Text>
                      <Icon name="chevronDown" size={16} color={colors.textSecondary} />
                    </HStack>
                  </Pressable>
                }
              />
            </HStack>
          }
        />

        {/* Android: showing the component triggers the native date dialog. */}
        {androidPickerVisible ? (
          <DateTimePicker value={selectedDate} mode="date" onChange={handleAndroidDateChange} display="default" />
        ) : null}

        {/* iOS: show a dedicated modal so "Pick date…" launches immediately (no inline field). */}
        <Dialog
          visible={iosDateDialogVisible}
          onClose={() => setIosDateDialogVisible(false)}
          title="Pick a date"
          footer={
            <View style={styles.dialogFooter}>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => {
                  setIosDateDialogVisible(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onPress={() => {
                  setSelectedDate(pendingDate);
                  setSelectionMode('custom');
                  setIosDateDialogVisible(false);
                }}
              >
                Done
              </Button>
            </View>
          }
        >
          <View style={styles.dialogBody}>
            <DateTimePicker
              value={pendingDate}
              mode="date"
              onChange={handleIosPendingDateChange}
              display="inline"
              style={styles.iosInlinePicker}
            />
          </View>
        </Dialog>

        <PlanPager
          insetMode="screen"
          targetDate={selectedDate}
          entryPoint="manual"
          activePageIndex={activePageIndex}
          onActivePageIndexChange={setActivePageIndex}
        />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerControlsRow: {
    // AppShell already provides the canvas horizontal padding.
    // Adding extra padding here double-indents the controls.
    paddingHorizontal: 0,
  },
  headerDateTrigger: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  headerDateTriggerText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  headerMoreButton: {
    backgroundColor: 'transparent',
  },
  menuItemText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  dialogFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  dialogBody: {
    marginTop: -spacing.sm,
  },
  iosInlinePicker: {
    alignSelf: 'stretch',
  },
});

