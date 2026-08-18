import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useCapabilityShell } from '../../../navigation/CapabilityShellContext';
import { useCapabilityMenuOpen } from '../../../navigation/CapabilityMenuStateContext';
import { useAppStore } from '../../../store/useAppStore';
import { colors, radii, spacing } from '../../../theme';
import { BottomDrawer } from '../../../ui/BottomDrawer';
import { BottomGuide } from '../../../ui/BottomGuide';
import { ActivityListItem } from '../../../ui/ActivityListItem';
import { Button, IconButton } from '../../../ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../ui/DropdownMenu';
import { Icon } from '../../../ui/Icon';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { ProfileAvatar } from '../../../ui/ProfileAvatar';
import { AppShell } from '../../../ui/layout/AppShell';
import { CanvasScrollView } from '../../../ui/layout/CanvasScrollView';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { ButtonLabel, Heading, Text } from '../../../ui/primitives';
import { ChoreDetailDrawer } from '../components/ChoreDetailDrawer';
import { ChoreReviewDrawer } from '../components/ChoreReviewDrawer';
import { ChoreSettingsDrawer } from '../components/ChoreSettingsDrawer';
import {
  ChoreAgreementBar,
  ChoreAgreementDrawer,
} from '../components/ChoreAgreementSurface';
import {
  projectChoreAgreement,
  projectChoreInventory,
  projectChoreReviewQueue,
  type ChoreMember,
  type ChoreOccurrence,
} from '../domain/choreLearning';
import { useChoreLearningStore } from '../runtime/useChoreLearningStore';
import { getImagePickerMediaTypesImages } from '../../../utils/imagePickerMediaTypes';
import { persistImageUri } from '../../../utils/persistImageUri';
import { useToastStore } from '../../../store/useToastStore';

type ChoresScreenProps = { now?: () => Date };

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

function rowMetadata(occurrence: ChoreOccurrence, tokensEnabled: boolean): string | undefined {
  const parts: string[] = [];
  if (tokensEnabled) parts.push(String(occurrence.tokenValue));
  if (occurrence.state === 'waiting_approval') parts.push('Waiting for approval');
  if (occurrence.state === 'needs_another_pass') parts.push('Needs another pass');
  return parts.length ? parts.join(' · ') : undefined;
}

function rowMetadataAccessibilityLabel(
  occurrence: ChoreOccurrence,
  tokensEnabled: boolean,
): string | undefined {
  const parts: string[] = [];
  if (tokensEnabled) {
    parts.push(`Earns ${occurrence.tokenValue} token${occurrence.tokenValue === 1 ? '' : 's'}`);
  }
  if (occurrence.state === 'waiting_approval') parts.push('Waiting for approval');
  if (occurrence.state === 'needs_another_pass') parts.push('Needs another pass');
  return parts.length ? parts.join('. ') : undefined;
}

function TakeActionLabel() {
  return (
    <View style={styles.actionLabel}>
      <Icon name="plus" size={11} color={colors.textPrimary} />
      <ButtonLabel>Take</ButtonLabel>
    </View>
  );
}

function ChoreStateIndicator({ kind }: { kind: 'waiting' | 'household' }) {
  const label = kind === 'waiting' ? 'Waiting for approval' : 'Available to the household';
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.stateIndicator, kind === 'household' && styles.householdIndicator]}
    >
      <Icon
        name={kind === 'waiting' ? 'clock' : 'home'}
        size={14}
        color={colors.textSecondary}
      />
    </View>
  );
}

function ForMemberRow({ occurrence, tokensEnabled, onOpen, onComplete, onReturnToFamilyList }: {
  occurrence: ChoreOccurrence;
  tokensEnabled: boolean;
  onOpen: () => void;
  onComplete: () => void;
  onReturnToFamilyList: () => void;
}) {
  const isCompleted = occurrence.state === 'completed';
  const waitingForApproval = occurrence.state === 'waiting_approval';
  const canComplete = occurrence.state === 'ready' || occurrence.state === 'claimed' || occurrence.state === 'needs_another_pass';
  return (
    <View style={styles.row} testID={`chores.occurrence.${occurrence.activityOccurrenceId}`}>
      <ActivityListItem
        surface="flat"
        title={occurrence.title}
        meta={rowMetadata(occurrence, tokensEnabled)}
        metaLeadingIconName={tokensEnabled ? 'token' : undefined}
        metaLeadingIconSize={16}
        metaAccessibilityLabel={rowMetadataAccessibilityLabel(occurrence, tokensEnabled)}
        isCompleted={isCompleted}
        showPriorityControl={false}
        showCheckbox={!waitingForApproval}
        leadingAccessory={waitingForApproval ? <ChoreStateIndicator kind="waiting" /> : undefined}
        onToggleComplete={canComplete ? onComplete : undefined}
        completionAccessibilityLabel={isCompleted
          ? `${occurrence.title}, completed`
          : `Complete ${occurrence.title}`}
        onPress={onOpen}
        rowAccessibilityLabel={`Open details for ${occurrence.title}`}
        rightAccessory={occurrence.state === 'claimed' ? (
          <View style={styles.claimedMenuAccessory}>
            <DropdownMenu>
              <DropdownMenuTrigger
                accessibilityLabel={`More options for ${occurrence.title}`}
                hitSlop={10}
              >
                <View pointerEvents="none">
                  <Button
                    accessible={false}
                    iconButtonSize={24}
                    size="icon"
                    variant="ghost"
                  >
                    <Icon name="more" size={16} color={colors.textSecondary} />
                  </Button>
                </View>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" sideOffset={6} align="end">
                <DropdownMenuItem
                  accessibilityLabel={`Return ${occurrence.title} to the family list`}
                  icon="minus"
                  label="Return to family list"
                  onPress={onReturnToFamilyList}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </View>
        ) : undefined}
      />
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
      <ActivityListItem
        surface="flat"
        title={occurrence.title}
        meta={tokensEnabled ? String(occurrence.tokenValue) : undefined}
        metaLeadingIconName={tokensEnabled ? 'token' : undefined}
        metaLeadingIconSize={16}
        metaAccessibilityLabel={rowMetadataAccessibilityLabel(occurrence, tokensEnabled)}
        showPriorityControl={false}
        showCheckbox={false}
        leadingAccessory={<ChoreStateIndicator kind="household" />}
        onPress={onOpen}
        rowAccessibilityLabel={`Open details for ${occurrence.title}`}
        metaAccessory={(
          <Button accessibilityLabel={`Take ${occurrence.title}`} onPress={onTake} size="inline" variant="outline">
            <TakeActionLabel />
          </Button>
        )}
      />
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
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreementBarHeight, setAgreementBarHeight] = useState(0);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);
  const projection = useMemo(() => projectChoreInventory(record, record.activeMemberId), [record]);
  const agreement = useMemo(() => projectChoreAgreement(record, record.activeMemberId), [record]);
  const reviewQueue = useMemo(() => projectChoreReviewQueue(record, record.activeMemberId), [record]);
  const selectedOccurrence = record.occurrences.find((item) => item.activityOccurrenceId === selectedOccurrenceId) ?? null;
  const isCaregiver = projection.member.role === 'caregiver';
  const caregiverAvatarUrl = userProfile?.avatarUrl || authIdentity?.avatarUrl;
  const completeOccurrence = (id: string) => complete(id, now().toISOString());
  const returnOccurrenceToFamilyList = (id: string) => {
    release(id);
    useToastStore.getState().showToast({
      message: 'Returned to the family list',
      variant: 'light',
      actionLabel: 'Undo',
      actionOnPress: () => take(id),
      bottomOffset: agreementBarHeight + spacing.md,
    });
  };
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
      <CanvasScrollView
        contentContainerStyle={styles.content}
        extraBottomPadding={isCaregiver && reviewQueue.length > 0
          ? spacing['3xl'] * 3
          : !isCaregiver && (agreement.headline || agreement.tokenBalance != null)
            ? agreementBarHeight + spacing.lg
            : 0}
        showsVerticalScrollIndicator={false}
      >
        {isCaregiver ? (
          <View style={styles.caregiverIntro}>
            <Heading variant="sm">Household chores</Heading>
            <Text tone="secondary">See what is open. Reviews appear here when a child asks for one.</Text>
          </View>
        ) : null}

        {!isCaregiver ? (
          <View style={styles.section} testID="chores.section.for-member">
            <Heading variant="sm">My chores</Heading>
            <View style={styles.rows}>
              {projection.forMember.length ? projection.forMember.map((occurrence) => (
                <ForMemberRow
                  key={occurrence.activityOccurrenceId}
                  occurrence={occurrence}
                  tokensEnabled={record.tokensEnabled}
                  onOpen={() => setSelectedOccurrenceId(occurrence.activityOccurrenceId)}
                  onComplete={() => completeOccurrence(occurrence.activityOccurrenceId)}
                  onReturnToFamilyList={() => returnOccurrenceToFamilyList(occurrence.activityOccurrenceId)}
                />
              )) : <Text tone="secondary">Nothing is waiting for you right now.</Text>}
            </View>
          </View>
        ) : null}

        <View style={styles.section} testID="chores.section.household">
          <Heading variant="sm">{isCaregiver ? 'Household' : 'Choose a chore'}</Heading>
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

      {!isCaregiver ? (
        <ChoreAgreementBar
          agreement={agreement}
          onOpen={() => setAgreementOpen(true)}
          onLayout={(event) => setAgreementBarHeight(event.nativeEvent.layout.height)}
        />
      ) : null}

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
        onReturnToFamilyList={() => { if (selectedOccurrence) returnOccurrenceToFamilyList(selectedOccurrence.activityOccurrenceId); setSelectedOccurrenceId(null); }}
        onAddPhoto={() => { if (selectedOccurrence) void addEvidencePhoto(selectedOccurrence); }}
      />
      <ChoreAgreementDrawer
        visible={agreementOpen}
        agreement={agreement}
        onClose={() => setAgreementOpen(false)}
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
  content: { gap: spacing['2xl'], paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  memberControl: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.gray100 },
  pressed: { opacity: 0.7 },
  caregiverIntro: { gap: spacing.xs },
  section: { gap: spacing.md },
  rows: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  row: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  stateIndicator: { width: 22, height: 22, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 7, borderWidth: 1, borderColor: colors.gray300, backgroundColor: colors.gray100 },
  householdIndicator: { borderWidth: 0 },
  drawerContent: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  memberList: { gap: spacing.sm },
  memberRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, borderRadius: radii.input },
  memberRowSelected: { backgroundColor: colors.gray100 },
  memberName: { flex: 1, gap: spacing.xs },
  guideContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.lg },
  guideCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  actionLabel: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  claimedMenuAccessory: { alignSelf: 'flex-start', flexShrink: 0 },
});
