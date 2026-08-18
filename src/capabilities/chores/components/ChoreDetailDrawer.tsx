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
import { ChoreMemberPill } from './ChoreMemberPill';
import { ChoreTokenValue } from './ChoreAgreementSurface';
import { formatChoreEventTimestamp } from './choreDetailPresentation';

type Props = {
  member: ChoreMember;
  members: ChoreMember[];
  occurrence: ChoreOccurrence | null;
  tokensEnabled: boolean;
  onClose: () => void;
  onTake: () => void;
  onComplete: () => void;
  onReturnToFamilyList: () => void;
  onTakePhoto: () => void;
  onChoosePhoto: () => void;
};

export function ChoreDetailDrawer({
  member,
  members,
  occurrence,
  tokensEnabled,
  onClose,
  onTake,
  onComplete,
  onReturnToFamilyList,
  onTakePhoto,
  onChoosePhoto,
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
  const performer = members.find((candidate) => candidate.id === occurrence?.performedByMemberId);
  const assignedMember = members.find((candidate) => candidate.id === occurrence?.assignedMemberId);
  const claimedMember = members.find((candidate) => candidate.id === occurrence?.claimedByMemberId);
  const relevantMember = performer ?? claimedMember ?? assignedMember;
  const approver = members.find((candidate) => candidate.id === occurrence?.reviewedByMemberId);
  const completedAt = formatChoreEventTimestamp(occurrence?.performedAtIso ?? null);
  const approvedAt = formatChoreEventTimestamp(occurrence?.reviewedAtIso ?? null);
  const isCompleted = occurrence?.state === 'completed';
  const memberPillAccessibilityLabel = relevantMember
    ? isCompleted
      ? `Completed by ${relevantMember.displayName}`
      : `For ${relevantMember.displayName}`
    : undefined;

  return (
    <BottomDrawer
      visible={Boolean(occurrence)}
      onClose={onClose}
      snapPoints={['78%', '92%']}
      initialSnapIndex={0}
      bottomAccessory={occurrence && (canTake || canComplete || canRelease) ? (
        <BottomDrawerFooter showTopBorder>
          <View style={styles.actions}>
            {canTake ? <Button fullWidth onPress={onTake}>Take chore</Button> : null}
            {canComplete ? (
              <Button fullWidth onPress={onComplete}>
                {occurrence?.reviewPolicy === 'caregiver_review' ? 'Submit for approval' : 'Mark done'}
              </Button>
            ) : null}
            {canRelease ? (
              <Button fullWidth variant="secondary" onPress={onReturnToFamilyList}>
                <View style={styles.buttonLabel}>
                  <Icon name="minus" size={17} color={colors.textPrimary} />
                  <Text variant="label">Return to family list</Text>
                </View>
              </Button>
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
            titleVariant="sm"
            onClose={onClose}
            closeAccessibilityLabel="Close chore details"
          />
          {relevantMember ? (
            <ChoreMemberPill
              name={relevantMember.displayName}
              accessibilityLabel={memberPillAccessibilityLabel}
            />
          ) : null}
          {canTake ? <Text tone="secondary">Anyone can take this chore.</Text> : null}
          {isCompleted && (completedAt || approvedAt) ? (
            <View style={styles.history}>
              {completedAt ? (
                <View style={styles.block}>
                  <Text variant="label">Completed</Text>
                  <Text>{completedAt}</Text>
                </View>
              ) : null}
              {approvedAt ? (
                <View style={styles.block}>
                  <Text variant="label">
                    {approver ? `Approved by ${approver.displayName}` : 'Approved'}
                  </Text>
                  <Text>{approvedAt}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {canAttachPhoto ? (
            <View style={styles.photoSection}>
              <View style={styles.block}>
                <Text variant="label">Photo</Text>
                <Text tone="secondary">Optional — add one if it helps show the finished chore.</Text>
              </View>
              {occurrence.evidencePhotoUri ? (
                <ChoreEvidencePhoto
                  uri={occurrence.evidencePhotoUri}
                  childName={relevantMember?.displayName ?? member.displayName}
                />
              ) : null}
              <Button
                accessibilityLabel={occurrence.evidencePhotoUri ? 'Retake photo of this chore' : 'Take a photo of this chore'}
                fullWidth
                variant="secondary"
                onPress={onTakePhoto}
              >
                <View style={styles.buttonLabel}>
                  <Icon name="camera" size={19} color={colors.textPrimary} />
                  <Text variant="label">{occurrence.evidencePhotoUri ? 'Retake photo' : 'Take a photo'}</Text>
                </View>
              </Button>
              <Button
                accessibilityLabel="Choose a photo for this chore"
                fullWidth
                variant="ghost"
                onPress={onChoosePhoto}
              >
                Choose from library
              </Button>
            </View>
          ) : null}
          {!canAttachPhoto && occurrence.evidencePhotoUri ? (
            <ChoreEvidencePhoto
              uri={occurrence.evidencePhotoUri}
              childName={relevantMember?.displayName ?? member.displayName}
            />
          ) : null}
          {!isCompleted ? (
            <View style={styles.block}>
              <Text variant="label">What done looks like</Text>
              <Text>{occurrence.definitionOfDone}</Text>
            </View>
          ) : null}
          {tokensEnabled ? (
            <View style={styles.block}>
              <Text variant="label">{isCompleted ? 'Earned' : 'Earns'}</Text>
              <ChoreTokenValue
                value={occurrence.tokenValue}
                context={isCompleted ? 'earned' : 'earning'}
              />
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
  photoSection: { gap: spacing.sm },
  history: { gap: spacing.md },
  buttonLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
