import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { BottomDrawerFooter } from '../../../ui/layout/BottomDrawerFooter';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Text } from '../../../ui/primitives';
import type { ChoreMember, ChoreOccurrence } from '../domain/choreLearning';
import { Icon } from '../../../ui/Icon';
import { ChoreEvidencePhoto } from './ChoreEvidencePhoto';

type Props = {
  member: ChoreMember;
  occurrence: ChoreOccurrence | null;
  tokensEnabled: boolean;
  onClose: () => void;
  onTake: () => void;
  onComplete: () => void;
  onRelease: () => void;
  onAddPhoto: () => void;
};

function tokenLabel(value: number): string {
  return `${value} token${value === 1 ? '' : 's'}`;
}

export function ChoreDetailDrawer({
  member,
  occurrence,
  tokensEnabled,
  onClose,
  onTake,
  onComplete,
  onRelease,
  onAddPhoto,
}: Props) {
  const canTake = occurrence?.state === 'available';
  const canComplete = occurrence?.state === 'ready'
    || occurrence?.state === 'claimed'
    || occurrence?.state === 'needs_another_pass';
  const canRelease = occurrence?.state === 'claimed';
  const canAttachPhoto = member.role === 'child'
    && occurrence != null
    && occurrence.state !== 'available'
    && occurrence.state !== 'completed'
    && (
      occurrence.assignedMemberId === member.id
      || occurrence.claimedByMemberId === member.id
      || occurrence.performedByMemberId === member.id
    );
  const scope = occurrence?.participation === 'open'
    ? 'Available to anyone'
    : `For ${member.displayName}`;

  return (
    <BottomDrawer
      visible={Boolean(occurrence)}
      onClose={onClose}
      snapPoints={['48%', '78%']}
      initialSnapIndex={0}
      bottomAccessory={occurrence && (canTake || canComplete || canRelease) ? (
        <BottomDrawerFooter showTopBorder>
          <View style={styles.actions}>
            {canTake ? <Button fullWidth onPress={onTake}>Take chore</Button> : null}
            {canComplete ? <Button fullWidth onPress={onComplete}>Mark done</Button> : null}
            {canRelease ? (
              <Button fullWidth variant="ghost" onPress={onRelease}>Release chore</Button>
            ) : null}
          </View>
        </BottomDrawerFooter>
      ) : undefined}
    >
      {occurrence ? (
        <BottomDrawerScrollView
          testID="chores.detail.drawer"
          contentContainerStyle={styles.content}
        >
          <BottomDrawerHeader
            variant="withClose"
            title={occurrence.title}
            subtitle={scope}
            onClose={onClose}
            closeAccessibilityLabel="Close chore details"
          />
          <View style={styles.block}>
            <Text variant="label">What done looks like</Text>
            <Text>{occurrence.definitionOfDone}</Text>
          </View>
          {occurrence.evidencePhotoUri ? (
            <ChoreEvidencePhoto
              uri={occurrence.evidencePhotoUri}
              childName={member.displayName}
            />
          ) : null}
          {canAttachPhoto ? (
            <Button
              accessibilityLabel={occurrence.evidencePhotoUri ? 'Change chore photo' : 'Add chore photo'}
              variant="secondary"
              onPress={onAddPhoto}
              style={styles.photoButton}
            >
              <View style={styles.buttonLabel}>
                <Icon name="camera" size={17} color={colors.textPrimary} />
                <Text variant="label">{occurrence.evidencePhotoUri ? 'Change photo' : 'Add photo'}</Text>
              </View>
            </Button>
          ) : null}
          {tokensEnabled ? (
            <View style={styles.block}>
              <Text variant="label">Reward</Text>
              <Text>{tokenLabel(occurrence.tokenValue)}</Text>
            </View>
          ) : null}
          {occurrence.state === 'waiting_approval' ? (
            <Text tone="secondary">A caregiver will review this chore.</Text>
          ) : null}
          {occurrence.state === 'needs_another_pass' ? (
            <View style={[styles.block, styles.feedback]}>
              <Text variant="label">Needs another pass</Text>
              <Text>{occurrence.reviewNote ?? 'Take another look, then mark it done again.'}</Text>
            </View>
          ) : null}
          {occurrence.state === 'completed' ? (
            <Text tone="secondary">This chore is complete.</Text>
          ) : null}
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
  block: { gap: spacing.xs },
  feedback: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.gray100,
  },
  actions: { gap: spacing.sm },
  photoButton: { alignSelf: 'flex-start' },
  buttonLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
