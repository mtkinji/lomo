import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { BottomDrawerFooter } from '../../../ui/layout/BottomDrawerFooter';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Text } from '../../../ui/primitives';
import type { ChoreMember, ChoreOccurrence } from '../domain/choreLearning';
import { ChoreMemberPill } from './ChoreMemberPill';

type Props = {
  visible: boolean;
  currentOccurrence: ChoreOccurrence | null;
  candidates: ChoreOccurrence[];
  member: ChoreMember;
  now: Date;
  onSubmit: (activityOccurrenceIds: string[]) => void;
  onClose: () => void;
};

function parseScheduledDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function datePresentation(scheduledDate: string, now: Date): { title: string; detail: string | null; accessibilityLabel: string } {
  const date = parseScheduledDate(scheduledDate);
  const yesterday = new Date(now);
  yesterday.setHours(12, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);
  const detail = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(date);
  const isYesterday = date.getFullYear() === yesterday.getFullYear()
    && date.getMonth() === yesterday.getMonth()
    && date.getDate() === yesterday.getDate();
  return isYesterday
    ? { title: 'Yesterday', detail, accessibilityLabel: `Yesterday, ${detail}` }
    : { title: detail, detail: null, accessibilityLabel: detail };
}

export function ChoreCorrectionDrawer({
  visible,
  currentOccurrence,
  candidates,
  member,
  now,
  onSubmit,
  onClose,
}: Props) {
  const candidateKey = candidates.map((candidate) => candidate.activityOccurrenceId).join('|');
  const singleCandidateId = candidates.length === 1 ? candidates[0].activityOccurrenceId : null;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(singleCandidateId ? [singleCandidateId] : []);
  }, [candidateKey, singleCandidateId, visible]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const submitLabel = selectedIds.length > 1
    ? `Ask caregiver to count ${selectedIds.length} days`
    : 'Ask caregiver to count it';
  const submitAccessibilityLabel = selectedIds.length === 0
    ? 'Ask caregiver to count earlier chores'
    : submitLabel;

  const toggle = (id: string) => {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((candidateId) => candidateId !== id)
      : [...current, id]);
  };

  return (
    <BottomDrawer
      visible={visible && Boolean(currentOccurrence)}
      onClose={onClose}
      snapPoints={['72%', '90%']}
      initialSnapIndex={0}
      bottomAccessory={currentOccurrence ? (
        <BottomDrawerFooter showTopBorder>
          <Button
            fullWidth
            accessibilityLabel={submitAccessibilityLabel}
            disabled={selectedIds.length === 0}
            onPress={() => onSubmit(selectedIds)}
          >
            {submitLabel}
          </Button>
        </BottomDrawerFooter>
      ) : undefined}
    >
      {currentOccurrence ? (
        <BottomDrawerScrollView
          testID="chores.correction.drawer"
          contentContainerStyle={styles.content}
        >
          <BottomDrawerHeader
            variant="withClose"
            title="Count an earlier chore"
            onClose={onClose}
            closeAccessibilityLabel="Close earlier chore correction"
          />
          <View style={styles.identity}>
            <Text variant="body">{currentOccurrence.title}</Text>
            <ChoreMemberPill name={member.displayName} />
          </View>
          <View style={styles.section}>
            <Text variant="label">When</Text>
            <View style={styles.dateList}>
              {candidates.map((candidate) => {
                if (!candidate.scheduledDate) return null;
                const presentation = datePresentation(candidate.scheduledDate, now);
                const selected = selectedSet.has(candidate.activityOccurrenceId);
                return (
                  <Pressable
                    key={candidate.activityOccurrenceId}
                    accessibilityRole="checkbox"
                    accessibilityLabel={presentation.accessibilityLabel}
                    accessibilityState={{ checked: selected }}
                    onPress={() => toggle(candidate.activityOccurrenceId)}
                    style={({ pressed }) => [styles.dateRow, pressed && styles.pressed]}
                  >
                    <View style={styles.dateCopy}>
                      <Text variant="body">{presentation.title}</Text>
                      {presentation.detail ? <Text tone="secondary">{presentation.detail}</Text> : null}
                    </View>
                    <View style={[styles.selection, selected && styles.selectionSelected]}>
                      {selected ? <Icon name="check" size={16} color={colors.primaryForeground} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Text tone="secondary">A caregiver will confirm it. Today’s chore stays open.</Text>
        </BottomDrawerScrollView>
      ) : null}
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  identity: { gap: spacing.sm },
  section: { gap: spacing.sm },
  dateList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.input,
    overflow: 'hidden',
  },
  dateRow: {
    minHeight: 62,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dateCopy: { flex: 1, minWidth: 0, gap: 2 },
  selection: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  pressed: { opacity: 0.7 },
});
