import { Pressable } from '@/src/ui/HapticPressable';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import type { Activity } from '../../../domain/types';
import { colors, radii, spacing, typography } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Text } from '../../../ui/Typography';

type ReminderMode = 'once' | 'weekly';

export function buildMealPlanningReminderActivity(input: {
  mode: ReminderMode;
  householdId: string;
  reminderAt: string;
  nowIso: string;
  id: string;
}): Activity {
  const date = new Date(input.reminderAt);
  if (!Number.isFinite(date.getTime())) throw new Error('Choose a valid reminder time.');
  return {
    id: input.id,
    goalId: null,
    title: 'Plan the next meals',
    type: 'task',
    tags: ['meals'],
    actionCardBinding: { providerId: 'meal_planning', projectionKind: 'organizer_cycle', resourceRef: input.householdId, sourceVersion: null },
    reminderAt: date.toISOString(),
    reminderSource: 'manual',
    repeatRule: input.mode === 'weekly' ? 'weekly' : undefined,
    repeatBasis: input.mode === 'weekly' ? 'scheduled' : undefined,
    repeatSeriesId: input.mode === 'weekly' ? input.id : null,
    orderIndex: null,
    phase: null,
    status: 'planned',
    actualMinutes: null,
    startedAt: null,
    completedAt: null,
    forceActual: {},
    creationSource: 'manual',
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  };
}

export function nextMealPlanningReminderAt(mode: ReminderMode, day: number, time: string, now = new Date()): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const target = new Date(now);
  target.setHours(Number(match[1]), Number(match[2]), 0, 0);
  if (mode === 'once') {
    if (target <= now) target.setDate(target.getDate() + 1);
  } else {
    const offset = (day - target.getDay() + 7) % 7;
    target.setDate(target.getDate() + offset);
    if (target <= now) target.setDate(target.getDate() + 7);
  }
  return target.toISOString();
}

export function MealPlanningReminderOfferDrawer({ visible, onClose, onCreate }: {
  visible: boolean;
  onClose(): void;
  onCreate(input: { mode: ReminderMode; reminderAt: string }): void;
}) {
  const [mode, setMode] = useState<ReminderMode | null>(null);
  const [weekday, setWeekday] = useState(0);
  const [time, setTime] = useState('17:00');
  const reminderAt = mode ? nextMealPlanningReminderAt(mode, weekday, time) : null;
  return <BottomDrawer visible={visible} onClose={onClose} snapPoints={['68%']}>
    <BottomDrawerScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <BottomDrawerHeader title="Plan again when it fits" subtitle="A planning reminder lives in Activities, where you can change or remove it anytime." variant="withClose" onClose={onClose} />
      <View style={styles.options}>
        {([['once', 'One time'], ['weekly', 'Every week']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)} style={[styles.option, mode === value && styles.selected]}><Text>{label}</Text></Pressable>)}
      </View>
      {mode === 'weekly' ? <View style={styles.days}>{['S','M','T','W','T','F','S'].map((label, day) => <Pressable key={`${label}-${day}`} accessibilityRole="radio" accessibilityLabel={['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][day]} accessibilityState={{ selected: weekday === day }} onPress={() => setWeekday(day)} style={[styles.day, weekday === day && styles.daySelected]}><Text>{label}</Text></Pressable>)}</View> : null}
      {mode ? <TextInput accessibilityLabel="Reminder time" placeholder="17:00" keyboardType="numbers-and-punctuation" value={time} onChangeText={setTime} style={styles.input} /> : null}
      {mode ? <Button fullWidth variant="outline" disabled={!reminderAt} onPress={() => reminderAt && onCreate({ mode, reminderAt })}>Add to Activities</Button> : null}
      <Button fullWidth variant="ghost" onPress={onClose}>Not now</Button>
    </BottomDrawerScrollView>
  </BottomDrawer>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  options: { overflow: 'hidden', borderRadius: radii.card, backgroundColor: colors.fieldFill },
  option: { minHeight: 52, justifyContent: 'center', paddingHorizontal: spacing.md },
  selected: { backgroundColor: colors.pine50 },
  days: { flexDirection: 'row', gap: spacing.xs },
  day: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.fieldFill },
  daySelected: { backgroundColor: colors.pine100 },
  input: { minHeight: 48, borderRadius: radii.input, paddingHorizontal: spacing.md, backgroundColor: colors.fieldFill, color: colors.textPrimary, ...typography.body },
});
