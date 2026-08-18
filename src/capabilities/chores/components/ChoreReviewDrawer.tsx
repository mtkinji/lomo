import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Icon } from '../../../ui/Icon';
import { BottomDrawerFooter } from '../../../ui/layout/BottomDrawerFooter';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Text } from '../../../ui/primitives';
import { ButtonLabel } from '../../../ui/Typography';
import { ProfileAvatar } from '../../../ui/ProfileAvatar';
import type { ChoreMember, ChoreOccurrence } from '../domain/choreLearning';
import { ChoreEvidencePhoto } from './ChoreEvidencePhoto';

type Props = {
  visible: boolean;
  queue: ChoreOccurrence[];
  members: ChoreMember[];
  tokensEnabled: boolean;
  onApprove: (id: string) => void;
  onAnotherPass: (id: string, note: string | null) => void;
  onClose: () => void;
};

function tokenLabel(value: number): string {
  return `${value} token${value === 1 ? '' : 's'}`;
}

function PerformerPill({ name }: { name: string }) {
  return (
    <View accessibilityLabel={name} style={styles.performerPill}>
      <ProfileAvatar name={name} size={28} />
      <Text variant="label">{name}</Text>
    </View>
  );
}

export function ChoreReviewDrawer({
  visible,
  queue,
  members,
  tokensEnabled,
  onApprove,
  onAnotherPass,
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

  const resolve = (action: 'approve' | 'another') => {
    if (!selected) return;
    if (action === 'approve') onApprove(selected.activityOccurrenceId);
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
            <Button fullWidth accessibilityLabel="Approve chore" onPress={() => resolve('approve')}>
              <View style={styles.approveLabel}>
                <Icon testID="chores.review.approve.check" name="check" size={18} color={colors.primaryForeground} />
                <ButtonLabel tone="inverse">Approve</ButtonLabel>
              </View>
            </Button>
            <Button fullWidth variant="secondary" onPress={() => resolve('another')}>
              Needs another pass
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
            <View style={styles.block}>
              <Text variant="label">What done looks like</Text>
              <Text>{selected.definitionOfDone}</Text>
            </View>
            {performerName ? <PerformerPill name={performerName} /> : null}
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
                <Text>{tokenLabel(selected.tokenValue)}</Text>
              </View>
            ) : null}
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
                    {name ? <PerformerPill name={name} /> : null}
                  </View>
                  {tokensEnabled ? <Text tone="secondary">{tokenLabel(occurrence.tokenValue)}</Text> : null}
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
  performerPill: {
    alignSelf: 'flex-start',
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.xs,
    paddingRight: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.gray100,
  },
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
