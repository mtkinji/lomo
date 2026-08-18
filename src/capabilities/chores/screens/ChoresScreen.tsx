import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useCapabilityShell } from '../../../navigation/CapabilityShellContext';
import { useCapabilityMenuOpen } from '../../../navigation/CapabilityMenuStateContext';
import { useAppStore } from '../../../store/useAppStore';
import { colors, radii, spacing } from '../../../theme';
import { BottomDrawer } from '../../../ui/BottomDrawer';
import { BottomGuide } from '../../../ui/BottomGuide';
import { Button, IconButton } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { ProfileAvatar } from '../../../ui/ProfileAvatar';
import { AppShell } from '../../../ui/layout/AppShell';
import { CanvasScrollView } from '../../../ui/layout/CanvasScrollView';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/primitives';
import { ChoreDetailDrawer } from '../components/ChoreDetailDrawer';
import { ChoreReviewDrawer } from '../components/ChoreReviewDrawer';
import { ChoreSettingsDrawer } from '../components/ChoreSettingsDrawer';
import {
  projectChoreInventory,
  projectChoreReviewQueue,
  type ChoreMember,
  type ChoreOccurrence,
} from '../domain/choreLearning';
import { useChoreLearningStore } from '../runtime/useChoreLearningStore';
import { getImagePickerMediaTypesImages } from '../../../utils/imagePickerMediaTypes';
import { persistImageUri } from '../../../utils/persistImageUri';

type ChoresScreenProps = { now?: () => Date };

function tokenLabel(value: number): string {
  return `${value} token${value === 1 ? '' : 's'}`;
}

function MemberControl({ member, avatarUrl, onPress }: {
  member: ChoreMember;
  avatarUrl?: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Switch household member, ${member.displayName}`}
      onPress={onPress}
      style={({ pressed }) => [styles.memberControl, pressed && styles.pressed]}
    >
      <ProfileAvatar name={member.displayName} avatarUrl={avatarUrl} size={30} />
      <Text variant="label">{member.displayName}</Text>
      <Icon name="chevronDown" size={15} color={colors.textSecondary} />
    </Pressable>
  );
}

function CompletionControl({ occurrence, onComplete }: { occurrence: ChoreOccurrence; onComplete: () => void }) {
  if (occurrence.state === 'completed') {
    return (
      <View accessible accessibilityLabel={`${occurrence.title}, completed`} style={[styles.completionControl, styles.completionControlDone]}>
        <Icon name="check" size={17} color={colors.primaryForeground} />
      </View>
    );
  }
  if (occurrence.state === 'waiting_approval') {
    return <View style={[styles.completionControl, styles.completionControlWaiting]}><Icon name="clock" size={16} color={colors.textSecondary} /></View>;
  }
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={`Complete ${occurrence.title}`}
      accessibilityState={{ checked: false }}
      hitSlop={6}
      onPress={onComplete}
      style={({ pressed }) => [styles.completionControl, pressed && styles.completionControlPressed]}
    />
  );
}

function ForMemberRow({ occurrence, tokensEnabled, onOpen, onComplete, onRelease }: {
  occurrence: ChoreOccurrence;
  tokensEnabled: boolean;
  onOpen: () => void;
  onComplete: () => void;
  onRelease: () => void;
}) {
  const isCompleted = occurrence.state === 'completed';
  return (
    <View style={styles.row} testID={`chores.occurrence.${occurrence.activityOccurrenceId}`}>
      <CompletionControl occurrence={occurrence} onComplete={onComplete} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open details for ${occurrence.title}`}
        onPress={onOpen}
        style={({ pressed }) => [styles.rowCopy, pressed && styles.pressed]}
      >
        <Text variant="body" style={isCompleted ? styles.completedTitle : undefined}>{occurrence.title}</Text>
        {occurrence.state === 'waiting_approval' ? <Text tone="secondary">Waiting for approval</Text> : null}
        {occurrence.state === 'needs_another_pass' ? <Text tone="secondary">Needs another pass</Text> : null}
        {occurrence.state === 'claimed' ? (
          <Button accessibilityLabel={`Release ${occurrence.title}`} onPress={onRelease} size="xs" style={styles.releaseButton} variant="ghost">Release</Button>
        ) : null}
      </Pressable>
      <View style={styles.rowMeta}>
        {tokensEnabled ? <Text tone="secondary">{tokenLabel(occurrence.tokenValue)}</Text> : null}
        {isCompleted ? <Text tone="secondary">Done</Text> : null}
      </View>
    </View>
  );
}

function HouseholdRow({ occurrence, tokensEnabled, onOpen, onTake }: {
  occurrence: ChoreOccurrence;
  tokensEnabled: boolean;
  onOpen: () => void;
  onTake: () => void;
}) {
  return (
    <View style={styles.row} testID={`chores.occurrence.${occurrence.activityOccurrenceId}`}>
      <View style={[styles.completionControl, styles.availableControl]}><Icon name="home" size={16} color={colors.textSecondary} /></View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open details for ${occurrence.title}`}
        onPress={onOpen}
        style={({ pressed }) => [styles.rowCopy, pressed && styles.pressed]}
      >
        <Text variant="body">{occurrence.title}</Text>
        {tokensEnabled ? <Text tone="secondary">{tokenLabel(occurrence.tokenValue)}</Text> : null}
      </Pressable>
      <Button accessibilityLabel={`Take ${occurrence.title}`} onPress={onTake} size="sm" variant="secondary">Take</Button>
    </View>
  );
}

export function ChoresScreen({ now = () => new Date() }: ChoresScreenProps) {
  const { openMenu, activeCapabilityId } = useCapabilityShell();
  const capabilityMenuOpen = useCapabilityMenuOpen();
  const authIdentity = useAppStore((state) => state.authIdentity);
  const userProfile = useAppStore((state) => state.userProfile);
  const record = useChoreLearningStore((state) => state.record);
  const selectMember = useChoreLearningStore((state) => state.selectMember);
  const take = useChoreLearningStore((state) => state.take);
  const release = useChoreLearningStore((state) => state.release);
  const complete = useChoreLearningStore((state) => state.complete);
  const setTokensEnabled = useChoreLearningStore((state) => state.setTokensEnabled);
  const approve = useChoreLearningStore((state) => state.approve);
  const requestAnotherPass = useChoreLearningStore((state) => state.requestAnotherPass);
  const setEvidencePhoto = useChoreLearningStore((state) => state.setEvidencePhoto);
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);
  const projection = useMemo(() => projectChoreInventory(record, record.activeMemberId), [record]);
  const reviewQueue = useMemo(() => projectChoreReviewQueue(record, record.activeMemberId), [record]);
  const selectedOccurrence = record.occurrences.find((item) => item.activityOccurrenceId === selectedOccurrenceId) ?? null;
  const isCaregiver = projection.member.role === 'caregiver';
  const caregiverAvatarUrl = userProfile?.avatarUrl || authIdentity?.avatarUrl;
  const progressRatio = projection.progress.expectedCount > 0
    ? Math.min(1, projection.progress.completedCount / projection.progress.expectedCount)
    : 0;
  const completeOccurrence = (id: string) => complete(id, now().toISOString());
  const addEvidencePhoto = async (occurrence: ChoreOccurrence) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => null);
    if (!permission?.granted) {
      Alert.alert('Photo access needed', 'Allow photo library access to attach a chore photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: getImagePickerMediaTypesImages(),
      quality: 0.82,
    });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (!uri) return;
    const stableUri = await persistImageUri({
      uri,
      subdir: 'chores/evidence',
      namePrefix: occurrence.activityOccurrenceId,
    });
    setEvidencePhoto(occurrence.activityOccurrenceId, stableUri);
  };

  return (
    <AppShell>
      <PageHeader
        title="Chores"
        onPressMenu={openMenu}
        moreMenu={isCaregiver ? (
          <IconButton accessibilityLabel="Chore settings" onPress={() => setSettingsOpen(true)} variant="ghost">
            <Icon name="settings" size={20} color={colors.textPrimary} />
          </IconButton>
        ) : undefined}
        rightElement={(
          <MemberControl
            member={projection.member}
            avatarUrl={isCaregiver ? caregiverAvatarUrl : undefined}
            onPress={() => setMemberDrawerOpen(true)}
          />
        )}
      />
      <CanvasScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!isCaregiver ? (
          <View style={styles.progressBlock}>
            <View style={styles.progressCopy}>
              <Text variant="label">{`${projection.progress.completedCount} of ${projection.progress.expectedCount} chores`}</Text>
              {record.tokensEnabled && projection.tokenBalance != null ? (
                <Text tone="secondary">{`${tokenLabel(projection.tokenBalance)} earned`}</Text>
              ) : null}
            </View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} /></View>
          </View>
        ) : (
          <View style={styles.caregiverIntro}>
            <Heading variant="sm">Household chores</Heading>
            <Text tone="secondary">See what is open. Reviews appear here when a child asks for one.</Text>
          </View>
        )}

        {!isCaregiver ? (
          <View style={styles.section} testID="chores.section.for-member">
            <Heading variant="sm">{`For ${projection.member.displayName}`}</Heading>
            <View style={styles.rows}>
              {projection.forMember.length ? projection.forMember.map((occurrence) => (
                <ForMemberRow
                  key={occurrence.activityOccurrenceId}
                  occurrence={occurrence}
                  tokensEnabled={record.tokensEnabled}
                  onOpen={() => setSelectedOccurrenceId(occurrence.activityOccurrenceId)}
                  onComplete={() => completeOccurrence(occurrence.activityOccurrenceId)}
                  onRelease={() => release(occurrence.activityOccurrenceId)}
                />
              )) : <Text tone="secondary">Nothing is waiting for you right now.</Text>}
            </View>
          </View>
        ) : null}

        <View style={styles.section} testID="chores.section.household">
          <Heading variant="sm">Household</Heading>
          <View style={styles.rows}>
            {projection.household.length ? projection.household.map((occurrence) => (
              <HouseholdRow
                key={occurrence.activityOccurrenceId}
                occurrence={occurrence}
                tokensEnabled={record.tokensEnabled}
                onOpen={() => setSelectedOccurrenceId(occurrence.activityOccurrenceId)}
                onTake={() => take(occurrence.activityOccurrenceId)}
              />
            )) : <Text tone="secondary">No household chores are open right now.</Text>}
          </View>
        </View>
      </CanvasScrollView>

      <BottomGuide
        visible={activeCapabilityId === 'chores' && isCaregiver && reviewQueue.length > 0 && !reviewOpen && !capabilityMenuOpen}
        showDragHandle={false}
        dynamicSizing
      >
        <View style={styles.guideContent}>
          <View style={styles.guideCopy}>
            <Text variant="label">{reviewQueue.length === 1 ? '1 chore ready for review' : `${reviewQueue.length} chores ready for review`}</Text>
            <Text tone="secondary">A child marked this work done.</Text>
          </View>
          <Button onPress={() => setReviewOpen(true)} size="sm">Review</Button>
        </View>
      </BottomGuide>

      <BottomDrawer visible={memberDrawerOpen} onClose={() => setMemberDrawerOpen(false)} snapPoints={['44%']}>
        <View testID="chores.member.drawer" style={styles.drawerContent}>
          <BottomDrawerHeader variant="withClose" title="View chores as" onClose={() => setMemberDrawerOpen(false)} />
          <View style={styles.memberList}>
            {record.members.map((member) => {
              const selected = member.id === projection.member.id;
              return (
                <Pressable
                  key={member.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${member.displayName}`}
                  accessibilityState={{ selected }}
                  onPress={() => { selectMember(member.id); setMemberDrawerOpen(false); }}
                  style={({ pressed }) => [styles.memberRow, selected && styles.memberRowSelected, pressed && styles.pressed]}
                >
                  <ProfileAvatar
                    name={member.displayName}
                    avatarUrl={member.role === 'caregiver' ? caregiverAvatarUrl : undefined}
                    size={38}
                  />
                  <View style={styles.memberName}>
                    <Text variant="body">{member.displayName}</Text>
                    {member.role === 'caregiver' ? <Text tone="secondary">Caregiver</Text> : null}
                  </View>
                  {selected ? <Icon name="check" size={18} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </BottomDrawer>

      <ChoreDetailDrawer
        member={projection.member}
        occurrence={selectedOccurrence}
        tokensEnabled={record.tokensEnabled}
        onClose={() => setSelectedOccurrenceId(null)}
        onTake={() => { if (selectedOccurrence) take(selectedOccurrence.activityOccurrenceId); setSelectedOccurrenceId(null); }}
        onComplete={() => { if (selectedOccurrence) completeOccurrence(selectedOccurrence.activityOccurrenceId); setSelectedOccurrenceId(null); }}
        onRelease={() => { if (selectedOccurrence) release(selectedOccurrence.activityOccurrenceId); setSelectedOccurrenceId(null); }}
        onAddPhoto={() => { if (selectedOccurrence) void addEvidencePhoto(selectedOccurrence); }}
      />
      <ChoreReviewDrawer
        visible={reviewOpen}
        queue={reviewQueue}
        members={record.members}
        tokensEnabled={record.tokensEnabled}
        onApprove={(id) => approve(id, now().toISOString())}
        onAnotherPass={(id, note) => requestAnotherPass(id, now().toISOString(), note)}
        onClose={() => setReviewOpen(false)}
      />
      <ChoreSettingsDrawer
        visible={settingsOpen}
        tokensEnabled={record.tokensEnabled}
        onChangeTokens={setTokensEnabled}
        onClose={() => setSettingsOpen(false)}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing['2xl'], paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: 180 },
  memberControl: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.gray100 },
  pressed: { opacity: 0.7 },
  progressBlock: { gap: spacing.sm },
  progressCopy: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  progressTrack: { height: 5, overflow: 'hidden', borderRadius: radii.pill, backgroundColor: colors.gray200 },
  progressFill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary },
  caregiverIntro: { gap: spacing.xs },
  section: { gap: spacing.md },
  rows: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  completionControl: { width: 28, height: 28, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.gray400, backgroundColor: colors.canvas },
  completionControlPressed: { backgroundColor: colors.gray100 },
  completionControlDone: { borderColor: colors.primary, backgroundColor: colors.primary },
  completionControlWaiting: { borderColor: colors.gray300, backgroundColor: colors.gray100 },
  availableControl: { borderWidth: 0, backgroundColor: colors.gray100 },
  rowCopy: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center', gap: spacing.xs },
  rowMeta: { flexShrink: 0, alignItems: 'flex-end', gap: spacing.xs },
  completedTitle: { color: colors.textSecondary, textDecorationLine: 'line-through' },
  releaseButton: { alignSelf: 'flex-start', marginLeft: -spacing.sm },
  drawerContent: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  memberList: { gap: spacing.sm },
  memberRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, borderRadius: radii.input },
  memberRowSelected: { backgroundColor: colors.gray100 },
  memberName: { flex: 1, gap: spacing.xs },
  guideContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.lg },
  guideCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
});
