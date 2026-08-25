import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Icon } from '../../../ui/Icon';
import { BottomDrawerFooter } from '../../../ui/layout/BottomDrawerFooter';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Text } from '../../../ui/primitives';
import { ButtonLabel } from '../../../ui/Typography';
import type { ChoreMember, ChoreOccurrence } from '../domain/choreLearning';
import { ChoreEvidencePhoto } from './ChoreEvidencePhoto';
import { ChoreMemberPill } from './ChoreMemberPill';
import { ChoreTokenValue } from './ChoreAgreementSurface';

type Props = {
  visible: boolean;
  queue: ChoreOccurrence[];
  members: ChoreMember[];
  tokensEnabled: boolean;
  onApprove: (id: string) => void;
  onAnotherPass: (id: string, note: string | null) => void;
  onLeaveEarlierMissed: (id: string) => void;
  onClose: () => void;
};

export function ChoreReviewDrawer({
  visible,
  queue,
  members,
  tokensEnabled,
  onApprove,
  onAnotherPass,
  onLeaveEarlierMissed,
  onClose,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const selected = queue.find((item) => item.activityOccurrenceId === selectedId)
    ?? (queue.length === 1 ? queue[0] : null);

  useEffect(() => {
    if (!visible) {
      setSelectedId(null);
      setNote('');
    } else if (selectedId && !queue.some((item) => item.activityOccurrenceId === selectedId)) {
      setSelectedId(null);
      setNote('');
    }
  }, [queue, selectedId, visible]);

  const performerName = selected
    ? members.find((member) => member.id === selected.performedByMemberId)?.displayName ?? 'Someone'
    : null;
  const title = selected
    ? selected.title
    : `${queue.length} ready for review`;
  const isEarlierCompletion = selected?.completionSource === 'earlier_day';

  const correctionDate = selected?.scheduledDate
    ? new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      .format(new Date(`${selected.scheduledDate}T12:00:00`))
    : null;
  const correctionRequested = selected?.reportedAtIso
    ? new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(selected.reportedAtIso))
    : null;
  const correctionStatementDate = (() => {
    if (!selected?.scheduledDate) return 'earlier';
    if (selected.reportedAtIso) {
      const scheduled = new Date(`${selected.scheduledDate}T12:00:00`);
      const requested = new Date(selected.reportedAtIso);
      requested.setHours(12, 0, 0, 0);
      requested.setDate(requested.getDate() - 1);
      if (scheduled.getTime() === requested.getTime()) return 'yesterday';
    }
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' })
      .format(new Date(`${selected.scheduledDate}T12:00:00`));
    return `on ${weekday}`;
  })();

  const resolve = (action: 'approve' | 'another' | 'leave_missed') => {
    if (!selected) return;
    if (action === 'approve') onApprove(selected.activityOccurrenceId);
    else if (action === 'leave_missed') onLeaveEarlierMissed(selected.activityOccurrenceId);
    else onAnotherPass(selected.activityOccurrenceId, note.trim() || null);
    setSelectedId(null);
    setNote('');
    if (queue.length === 1) onClose();
  };

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['78%', '92%']}
      initialSnapIndex={0}
      keyboardBehavior="extend"
      bottomAccessory={selected ? (
        <BottomDrawerFooter showTopBorder>
          <View style={styles.actions}>
            <Button
              fullWidth
              accessibilityLabel={isEarlierCompletion ? 'Count earlier chore' : 'Approve chore'}
              onPress={() => resolve('approve')}
            >
              <View style={styles.approveLabel}>
                <Icon testID="chores.review.approve.check" name="check" size={18} color={colors.primaryForeground} />
                <ButtonLabel tone="inverse">{isEarlierCompletion ? 'Count it' : 'Approve'}</ButtonLabel>
              </View>
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onPress={() => resolve(isEarlierCompletion ? 'leave_missed' : 'another')}
            >
              {isEarlierCompletion ? 'Leave as missed' : 'Needs another pass'}
            </Button>
          </View>
        </BottomDrawerFooter>
      ) : undefined}
    >
      <BottomDrawerScrollView
        testID="chores.review.drawer"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
      >
        <BottomDrawerHeader
          variant="withClose"
          title={title}
          onClose={onClose}
          closeAccessibilityLabel="Close chore review"
        />
        {selected ? (
          <>
            {isEarlierCompletion ? <Text tone="secondary">Earlier completion</Text> : null}
            {isEarlierCompletion && performerName ? <ChoreMemberPill name={performerName} /> : null}
            {isEarlierCompletion ? (
              <View style={styles.block}>
                <Text variant="body">{performerName} says this was done {correctionStatementDate}.</Text>
                {correctionDate ? (
                  <Text tone="secondary">
                    For {correctionDate}{correctionRequested ? ` · requested ${correctionRequested}` : ''}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <View style={styles.block}>
              <Text variant="label">What done looks like</Text>
              <Text>{selected.definitionOfDone}</Text>
            </View>
            {!isEarlierCompletion && performerName ? <ChoreMemberPill name={performerName} /> : null}
            {selected.evidencePhotoUri && performerName ? (
              <ChoreEvidencePhoto
                uri={selected.evidencePhotoUri}
                childName={performerName}
                compact
              />
            ) : null}
            {tokensEnabled ? (
              <View style={styles.block}>
                <Text variant="label">Reward after approval</Text>
                <ChoreTokenValue value={selected.tokenValue} context="earning" />
              </View>
            ) : null}
            {!isEarlierCompletion ? (
              <Input
                label="Note (optional)"
                placeholder="What should they take another look at?"
                value={note}
                onChangeText={setNote}
                multiline
                multilineMinHeight={82}
                multilineMaxHeight={120}
                elevation="flat"
                variant="outline"
              />
            ) : null}
          </>
        ) : (
          <View style={styles.queue}>
            {queue.map((occurrence) => {
              const name = members.find((member) => member.id === occurrence.performedByMemberId)?.displayName;
              return (
                <Pressable
                  key={occurrence.activityOccurrenceId}
                  accessibilityRole="button"
                  accessibilityLabel={`Review ${occurrence.title}`}
                  onPress={() => setSelectedId(occurrence.activityOccurrenceId)}
                  style={({ pressed }) => [styles.queueRow, pressed && styles.pressed]}
                >
                  <View style={styles.queueCopy}>
                    <Text variant="body">{occurrence.title}</Text>
                    {name ? <ChoreMemberPill name={name} /> : null}
                    {occurrence.completionSource === 'earlier_day' && occurrence.scheduledDate ? (
                      <Text tone="secondary">
                        Earlier completion · {new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                          .format(new Date(`${occurrence.scheduledDate}T12:00:00`))}
                      </Text>
                    ) : null}
                  </View>
                  {tokensEnabled ? (
                    <ChoreTokenValue value={occurrence.tokenValue} context="earning" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  block: { gap: spacing.xs },
  actions: { gap: spacing.sm },
  approveLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  queue: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  queueRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    borderRadius: radii.input,
  },
  queueCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  pressed: { opacity: 0.7 },
});
