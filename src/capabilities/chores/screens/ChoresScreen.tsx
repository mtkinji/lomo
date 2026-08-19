import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, type TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useCapabilityShell } from '../../../navigation/CapabilityShellContext';
import { useCapabilityMenuOpen } from '../../../navigation/CapabilityMenuStateContext';
import { useAppStore } from '../../../store/useAppStore';
import { colors, radii, spacing } from '../../../theme';
import { ActivityListItem } from '../../../ui/ActivityListItem';
import { Button, IconButton } from '../../../ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../../../ui/DropdownMenu';
import { Icon } from '../../../ui/Icon';
import {
  InventoryControlGroup,
  InventoryControlSurface,
} from '../../../ui/InventoryControlGroup';
import { ProfileAvatar } from '../../../ui/ProfileAvatar';
import { AppShell } from '../../../ui/layout/AppShell';
import { CanvasScrollView } from '../../../ui/layout/CanvasScrollView';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { ButtonLabel, Heading, Text } from '../../../ui/primitives';
import { ChoreDetailDrawer } from '../components/ChoreDetailDrawer';
import { ChoreEditorDrawer } from '../components/ChoreEditorDrawer';
import { ChoreMemberPill } from '../components/ChoreMemberPill';
import { ChoreReviewDrawer } from '../components/ChoreReviewDrawer';
import { ChoreSettingsDrawer } from '../components/ChoreSettingsDrawer';
import {
  ChoreAgreementBar,
  ChoreAgreementDrawer,
} from '../components/ChoreAgreementSurface';
import {
  projectChoreAgreement,
  projectCaregiverChoreInventory,
  projectChoreInventory,
  projectChoreReviewQueue,
  type ChoreMember,
  type ChoreOccurrence,
  type ChoreSeries,
} from '../domain/choreLearning';
import { useChoreLearningStore } from '../runtime/useChoreLearningStore';
import { getImagePickerMediaTypesImages } from '../../../utils/imagePickerMediaTypes';
import { persistImageUri } from '../../../utils/persistImageUri';
import { useToastStore } from '../../../store/useToastStore';
import { QuickAddDock } from '../../../features/activities/QuickAddDock';
import { FloatingDockActionButton } from '../../../features/activities/FloatingDockActionButton';
import {
  DEFAULT_QUICK_ADD_AI_ACTIONS,
  type QuickAddAiAction,
} from '../../../features/activities/useQuickAddDockController';
import { enrichActivityWithAI } from '../../../services/ai';
import {
  applyChoreDraftEnrichment,
  createChoreDraft,
  createChoreDraftFromSeries,
  type ChoreDraft,
  type ChoreDraftField,
} from '../domain/choreCreation';
import {
  RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX,
  RESTING_COMPOSER_HEIGHT_PX,
  RESTING_COMPOSER_HORIZONTAL_INSET_PX,
} from '../../../ui/layout/restingComposerMetrics';
import { UnifiedChatDrawer } from '../../../features/unifiedChat/UnifiedChatDrawer';
import type { UnifiedChatLaunchContext } from '../../../features/unifiedChat/launchContext';
import { formatActivityRepeatLabel } from '../../../features/activities/activityRepeatLabels';

type ChoresScreenProps = { now?: () => Date };

function tokenCount(value: number): string {
  return `${value} token${value === 1 ? '' : 's'}`;
}

function MemberMenu({ member, members, caregiverAvatarUrl, onSelect }: {
  member: ChoreMember;
  members: ChoreMember[];
  caregiverAvatarUrl?: string | null;
  onSelect: (memberId: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Switch household member, ${member.displayName}`}
          hitSlop={{ top: 6, bottom: 6 }}
          style={({ pressed }) => [styles.memberControl, pressed && styles.pressed]}
        >
          <ProfileAvatar
            name={member.displayName}
            avatarUrl={member.role === 'caregiver' ? caregiverAvatarUrl : undefined}
            size={24}
          />
          <Text variant="label">{member.displayName}</Text>
          <Icon name="chevronDown" size={15} color={colors.textSecondary} />
        </Pressable>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        testID="chores.member.menu"
        side="bottom"
        sideOffset={6}
        align="end"
        style={styles.memberMenu}
      >
        <DropdownMenuLabel>View chores as</DropdownMenuLabel>
        {members.map((option) => (
          <DropdownMenuItem
            key={option.id}
            accessibilityLabel={`Switch to ${option.displayName}`}
            selected={option.id === member.id}
            onPress={() => onSelect(option.id)}
          >
            <View style={styles.memberMenuItemContent}>
              <ProfileAvatar
                name={option.displayName}
                avatarUrl={option.role === 'caregiver' ? caregiverAvatarUrl : undefined}
                size={24}
              />
              <Text>{option.displayName}</Text>
              {option.role === 'caregiver' ? <Text tone="secondary">· Caregiver</Text> : null}
            </View>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function rowMetadata(occurrence: ChoreOccurrence, tokensEnabled: boolean): string | undefined {
  const parts: string[] = [];
  if (tokensEnabled) parts.push(tokenCount(occurrence.tokenValue));
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

function ChoreWaitingIndicator() {
  return (
    <View
      accessible
      accessibilityLabel="Waiting for approval"
      style={styles.stateIndicator}
    >
      <Icon name="clock" size={14} color={colors.textSecondary} />
    </View>
  );
}

function ForMemberRow({ occurrence, tokensEnabled, onOpen, onAttemptComplete, onReopen, onReturnToFamilyList }: {
  occurrence: ChoreOccurrence;
  tokensEnabled: boolean;
  onOpen: () => void;
  onAttemptComplete: () => void;
  onReopen: () => void;
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
        metaLeadingIconName={tokensEnabled ? 'circleDollarSign' : undefined}
        metaLeadingIconSize={15}
        metaAccessibilityLabel={rowMetadataAccessibilityLabel(occurrence, tokensEnabled)}
        isCompleted={isCompleted}
        showPriorityControl={false}
        showCheckbox={!waitingForApproval}
        leadingAccessory={waitingForApproval ? <ChoreWaitingIndicator /> : undefined}
        onToggleComplete={isCompleted ? onReopen : canComplete ? onAttemptComplete : undefined}
        completionAccessibilityLabel={isCompleted
          ? `Mark ${occurrence.title} incomplete`
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
        meta={tokensEnabled ? tokenCount(occurrence.tokenValue) : undefined}
        metaLeadingIconName={tokensEnabled ? 'circleDollarSign' : undefined}
        metaLeadingIconSize={15}
        metaAccessibilityLabel={rowMetadataAccessibilityLabel(occurrence, tokensEnabled)}
        showPriorityControl={false}
        showCheckbox={false}
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

function caregiverRepeatLabel(series: ChoreSeries): string {
  const label = formatActivityRepeatLabel({
    repeatRule: series.repeatRule,
    repeatCustom: series.repeatCustom,
  });
  return label === 'Off' ? 'One time' : label;
}

function CaregiverRow({ series, members, tokensEnabled, onOpen }: {
  series: ChoreSeries;
  members: ChoreMember[];
  tokensEnabled: boolean;
  onOpen: () => void;
}) {
  const assignedMember = series.assignedMemberId
    ? members.find((member) => member.id === series.assignedMemberId) ?? null
    : null;
  const assignee = assignedMember?.displayName ?? 'Household';
  const metadata = `${caregiverRepeatLabel(series)}${tokensEnabled ? ` · ${tokenCount(series.tokenValue)}` : ''}`;
  const accessibilityMetadata = `${assignee} · ${metadata}`;
  return (
    <View style={styles.row} testID={`chores.series.${series.activitySeriesId}`}>
      <ActivityListItem
        surface="flat"
        title={series.title}
        meta={metadata}
        metaLeadingAccessory={(
          <ChoreMemberPill
            accessible={false}
            kind={assignedMember ? 'member' : 'household'}
            name={assignee}
            size="compact"
            testID={assignedMember
              ? `chores.assignee.${assignedMember.id}`
              : 'chores.assignee.household'}
          />
        )}
        showPriorityControl={false}
        showCheckbox={false}
        onPress={onOpen}
        rowAccessibilityLabel={`Edit ${series.title}. ${accessibilityMetadata}`}
      />
    </View>
  );
}

type CaregiverChoreFilter = 'all' | 'household' | string;

function CaregiverInventoryFilter({ value, members, onChange }: {
  value: CaregiverChoreFilter;
  members: ChoreMember[];
  onChange: (value: CaregiverChoreFilter) => void;
}) {
  const selectedMember = members.find((member) => member.id === value);
  const label = value === 'all'
    ? 'All chores'
    : value === 'household'
      ? 'Household'
      : selectedMember?.displayName ?? 'All chores';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Filter chores, ${label}`}
          style={({ pressed }) => pressed ? styles.inventoryControlPressed : undefined}
        >
          <InventoryControlGroup testID="chores.inventory-controls">
            <InventoryControlSurface
              active={value !== 'all'}
              count={value === 'all' ? 0 : 1}
              iconName="funnel"
              testID="chores.inventory-filter"
            />
          </InventoryControlGroup>
        </Pressable>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" sideOffset={6} align="start">
        <DropdownMenuLabel>Show chores for</DropdownMenuLabel>
        <DropdownMenuItem
          accessibilityLabel="Show all chores"
          selected={value === 'all'}
          onPress={() => onChange('all')}
        >
          <Text>All chores</Text>
        </DropdownMenuItem>
        {members.filter((member) => member.role === 'child').map((member) => (
          <DropdownMenuItem
            key={member.id}
            accessibilityLabel={`Show ${member.displayName} chores`}
            selected={value === member.id}
            onPress={() => onChange(member.id)}
          >
            <View style={styles.filterMenuItem}>
              <ProfileAvatar name={member.displayName} size={24} />
              <Text>{member.displayName}</Text>
            </View>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          accessibilityLabel="Show household chores"
          selected={value === 'household'}
          onPress={() => onChange('household')}
        >
          <View style={styles.filterMenuItem}>
            <View style={styles.householdFilterMark}>
              <Icon name="home" size={15} color={colors.pine800} /> {/* @kwilt-brand-moment: household filter identity uses the requested pine mark. */}
            </View>
            <Text>Household</Text>
          </View>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
  const reopen = useChoreLearningStore((state) => state.reopen);
  const setTokensEnabled = useChoreLearningStore((state) => state.setTokensEnabled);
  const approve = useChoreLearningStore((state) => state.approve);
  const requestAnotherPass = useChoreLearningStore((state) => state.requestAnotherPass);
  const setEvidencePhoto = useChoreLearningStore((state) => state.setEvidencePhoto);
  const addChore = useChoreLearningStore((state) => state.addChore);
  const updateChore = useChoreLearningStore((state) => state.updateChore);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreementBarHeight, setAgreementBarHeight] = useState(0);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [quickAddFocused, setQuickAddFocused] = useState(false);
  const [quickAddAiActions, setQuickAddAiActions] = useState<QuickAddAiAction[]>(
    DEFAULT_QUICK_ADD_AI_ACTIONS,
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  const [choreDraft, setChoreDraft] = useState<ChoreDraft | null>(null);
  const [enrichingDraft, setEnrichingDraft] = useState(false);
  const [dockReservedHeight, setDockReservedHeight] = useState(0);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatThreadId, setChatThreadId] = useState<string | null>(null);
  const [caregiverFilter, setCaregiverFilter] = useState<CaregiverChoreFilter>('all');
  const quickAddInputRef = useRef<TextInput | null>(null);
  const touchedDraftFieldsRef = useRef(new Set<ChoreDraftField>());
  const enrichmentRunRef = useRef(0);
  const projectionNow = now();
  const projection = projectChoreInventory(record, record.activeMemberId, projectionNow);
  const agreement = projectChoreAgreement(record, record.activeMemberId, projectionNow);
  const reviewQueue = useMemo(() => projectChoreReviewQueue(record, record.activeMemberId), [record]);
  const selectedOccurrence = record.occurrences.find((item) => item.activityOccurrenceId === selectedOccurrenceId) ?? null;
  const isCaregiver = projection.member.role === 'caregiver';
  const chatLaunchContext = useMemo<UnifiedChatLaunchContext>(() => ({
    capabilityId: 'chores',
    surface: 'inventory',
    returnTarget: { name: 'Chores' },
  }), []);
  const caregiverAvatarUrl = userProfile?.avatarUrl || authIdentity?.avatarUrl;
  const caregiverInventory = useMemo(
    () => projectCaregiverChoreInventory(record, record.activeMemberId),
    [record],
  );
  const caregiverOccurrences = useMemo(() => {
    if (caregiverFilter === 'all') return caregiverInventory;
    if (caregiverFilter === 'household') {
      return caregiverInventory.filter((occurrence) => occurrence.assignedMemberId == null);
    }
    return caregiverInventory.filter((occurrence) => occurrence.assignedMemberId === caregiverFilter);
  }, [caregiverFilter, caregiverInventory]);
  const completeOccurrence = (id: string) => complete(id, now().toISOString());
  const closeChoreEditor = () => {
    enrichmentRunRef.current += 1;
    setEnrichingDraft(false);
    setEditorOpen(false);
    setEditingSeriesId(null);
    setChoreDraft(null);
    touchedDraftFieldsRef.current.clear();
  };
  const openChoreEditor = (series: ChoreSeries) => {
    enrichmentRunRef.current += 1;
    touchedDraftFieldsRef.current.clear();
    setEnrichingDraft(false);
    setEditingSeriesId(series.activitySeriesId);
    setChoreDraft(createChoreDraftFromSeries(series));
    setEditorOpen(true);
  };
  const changeChoreDraft = <Field extends ChoreDraftField>(
    field: Field,
    value: ChoreDraft[Field],
  ) => {
    touchedDraftFieldsRef.current.add(field);
    setChoreDraft((current) => current ? { ...current, [field]: value } : current);
  };
  const submitQuickAdd = (options?: { aiActions?: QuickAddAiAction[] }) => {
    const sourceText = quickAddValue.trim();
    if (!sourceText) return;
    const initialDraft = createChoreDraft(sourceText, record.members);
    const selectedActions = (options?.aiActions ?? [])
      .filter((action): action is Exclude<QuickAddAiAction, 'cover_image'> => action !== 'cover_image');
    const runId = enrichmentRunRef.current + 1;
    enrichmentRunRef.current = runId;
    touchedDraftFieldsRef.current.clear();
    setChoreDraft(initialDraft);
    setEditorOpen(true);
    setQuickAddFocused(false);
    setQuickAddValue('');
    setEnrichingDraft(selectedActions.length > 0);
    if (selectedActions.length === 0) return;

    void enrichActivityWithAI({
      title: sourceText,
      goalId: null,
      selectedActions,
    }).then((enrichment) => {
      if (enrichmentRunRef.current !== runId) return;
      setChoreDraft((current) => current
        ? applyChoreDraftEnrichment(current, enrichment, touchedDraftFieldsRef.current)
        : current);
    }).finally(() => {
      if (enrichmentRunRef.current === runId) setEnrichingDraft(false);
    });
  };
  const commitChoreDraft = () => {
    if (!choreDraft?.title.trim()) return;
    if (editingSeriesId) {
      updateChore(editingSeriesId, choreDraft);
      closeChoreEditor();
      return;
    }
    const createdAt = now();
    addChore(
      choreDraft,
      createdAt.toISOString(),
      `chore-${createdAt.getTime().toString(36)}-${record.occurrences.length + 1}`,
    );
    closeChoreEditor();
  };
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
  const addEvidencePhoto = async (
    occurrence: ChoreOccurrence,
    source: 'camera' | 'library',
  ) => {
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photo access needed',
          source === 'camera'
            ? 'Allow camera access in Settings to take a chore photo.'
            : 'Allow photo library access in Settings to choose a chore photo.',
        );
        return;
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: getImagePickerMediaTypesImages(),
        quality: 0.82,
      };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;
      const stableUri = await persistImageUri({
        uri,
        subdir: 'chores/evidence',
        namePrefix: occurrence.activityOccurrenceId,
      });
      setEvidencePhoto(occurrence.activityOccurrenceId, stableUri);
    } catch {
      Alert.alert('Unable to add photo', 'Something went wrong. Please try again.');
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Chores"
        onPressMenu={openMenu}
        moreMenu={isCaregiver ? (
          <IconButton accessibilityLabel="Chore settings" onPress={() => setSettingsOpen(true)} variant="ghost">
            <Icon
              testID="chores.header.overflow.icon.more"
              name="more"
              size={20}
              color={colors.textPrimary}
            />
          </IconButton>
        ) : undefined}
        rightElement={(
          <MemberMenu
            member={projection.member}
            members={record.members}
            caregiverAvatarUrl={caregiverAvatarUrl}
            onSelect={selectMember}
          />
        )}
      />
      <CanvasScrollView
        contentContainerStyle={styles.content}
        extraBottomPadding={isCaregiver && reviewQueue.length > 0
          ? Math.max(dockReservedHeight, spacing['3xl'] * 3)
          : isCaregiver
            ? dockReservedHeight
          : !isCaregiver && (agreement.headline || agreement.tokenBalance != null)
            ? agreementBarHeight + spacing.lg
            : 0}
        showsVerticalScrollIndicator={false}
      >
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
                  onAttemptComplete={() => setSelectedOccurrenceId(occurrence.activityOccurrenceId)}
                  onReopen={() => reopen(occurrence.activityOccurrenceId)}
                  onReturnToFamilyList={() => returnOccurrenceToFamilyList(occurrence.activityOccurrenceId)}
                />
              )) : <Text tone="secondary">Nothing is waiting for you right now.</Text>}
            </View>
          </View>
        ) : null}

        <View style={styles.section} testID="chores.section.household">
          {isCaregiver ? (
            <CaregiverInventoryFilter
              value={caregiverFilter}
              members={record.members}
              onChange={setCaregiverFilter}
            />
          ) : <Heading variant="sm">Choose a chore</Heading>}
          <View style={styles.rows}>
            {isCaregiver ? (
              caregiverOccurrences.length ? caregiverOccurrences.map((series) => (
                <CaregiverRow
                  key={series.activitySeriesId}
                  series={series}
                  members={record.members}
                  tokensEnabled={record.tokensEnabled}
                  onOpen={() => openChoreEditor(series)}
                />
              )) : <Text tone="secondary">No chores have been created yet.</Text>
            ) : (
              projection.household.length ? projection.household.map((occurrence) => (
                <HouseholdRow
                  key={occurrence.activityOccurrenceId}
                  occurrence={occurrence}
                  tokensEnabled={record.tokensEnabled}
                  onOpen={() => setSelectedOccurrenceId(occurrence.activityOccurrenceId)}
                  onTake={() => take(occurrence.activityOccurrenceId)}
                />
              )) : <Text tone="secondary">No household chores are open right now.</Text>
            )}
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

      {activeCapabilityId === 'chores'
        && isCaregiver
        && !capabilityMenuOpen
        && !editorOpen
        && !reviewOpen
        && !settingsOpen
        && !chatVisible
        && selectedOccurrence == null ? (
          <>
            <QuickAddDock
              placement="bottomDock"
              placeholder="Add a chore"
              value={quickAddValue}
              onChangeText={setQuickAddValue}
              inputRef={quickAddInputRef}
              isFocused={quickAddFocused}
              setIsFocused={setQuickAddFocused}
              onSubmit={submitQuickAdd}
              onCollapse={() => setQuickAddFocused(false)}
              selectedAiActions={quickAddAiActions}
              onSelectedAiActionsChange={setQuickAddAiActions}
              availableAiActions={['steps', 'triggers', 'details']}
              aiActionLabels={{
                details: 'Clarify done',
                triggers: 'Set a routine',
                steps: 'Add steps',
              }}
              showLeadingAffordance={false}
              inputAccessibilityLabel="Chore description"
              submitAccessibilityLabel="Continue creating chore"
              floatingRightInsetPx={RESTING_COMPOSER_HORIZONTAL_INSET_PX
                + (reviewQueue.length > 0 ? 2 : 1) * (RESTING_COMPOSER_HEIGHT_PX + spacing.sm)}
              collapsedBottomOffsetPx={RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX}
              onReservedHeightChange={setDockReservedHeight}
            />
            {!quickAddFocused ? (
              <View testID="chores.dock.actions" style={styles.dockActions}>
                {reviewQueue.length > 0 ? (
                  <View>
                    <FloatingDockActionButton
                      testID="chores.review.action"
                      accessibilityLabel={`${reviewQueue.length} ${reviewQueue.length === 1 ? 'chore' : 'chores'} ready for review`}
                      accessibilityHint="Opens work submitted by children"
                      icon="inbox"
                      isProminent
                      onPress={() => setReviewOpen(true)}
                      size={RESTING_COMPOSER_HEIGHT_PX}
                    />
                    <View pointerEvents="none" style={styles.reviewBadge}>
                      <Text style={styles.reviewBadgeText}>{reviewQueue.length}</Text>
                    </View>
                  </View>
                ) : null}
                <FloatingDockActionButton
                  testID="chores.chat.action"
                  accessibilityLabel="Chat about chores"
                  accessibilityHint="Opens contextual Chat for chores"
                  icon="navAiGuide"
                  isProminent
                  onPress={() => setChatVisible(true)}
                  size={RESTING_COMPOSER_HEIGHT_PX}
                />
              </View>
            ) : null}
          </>
        ) : null}

      <ChoreDetailDrawer
        member={projection.member}
        members={record.members}
        occurrence={selectedOccurrence}
        tokensEnabled={record.tokensEnabled}
        onClose={() => setSelectedOccurrenceId(null)}
        onTake={() => { if (selectedOccurrence) take(selectedOccurrence.activityOccurrenceId); setSelectedOccurrenceId(null); }}
        onComplete={() => { if (selectedOccurrence) completeOccurrence(selectedOccurrence.activityOccurrenceId); setSelectedOccurrenceId(null); }}
        onReturnToFamilyList={() => { if (selectedOccurrence) returnOccurrenceToFamilyList(selectedOccurrence.activityOccurrenceId); setSelectedOccurrenceId(null); }}
        onTakePhoto={() => { if (selectedOccurrence) void addEvidencePhoto(selectedOccurrence, 'camera'); }}
        onChoosePhoto={() => { if (selectedOccurrence) void addEvidencePhoto(selectedOccurrence, 'library'); }}
      />
      <ChoreAgreementDrawer
        visible={agreementOpen}
        agreement={agreement}
        onClose={() => setAgreementOpen(false)}
      />
      <ChoreEditorDrawer
        visible={editorOpen}
        draft={choreDraft}
        members={record.members}
        tokensEnabled={record.tokensEnabled}
        enriching={enrichingDraft}
        mode={editingSeriesId ? 'edit' : 'create'}
        onChange={changeChoreDraft}
        onAdd={commitChoreDraft}
        onClose={closeChoreEditor}
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
      <UnifiedChatDrawer
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        launchContext={chatLaunchContext}
        scopeLabel="Chores"
        source="chores_contextual_drawer"
        threadId={chatThreadId}
        onThreadIdChange={setChatThreadId}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing['2xl'], paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  memberControl: { height: 32, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.xs, paddingRight: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.gray100 },
  memberMenu: { minWidth: 220 },
  memberMenuItemContent: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pressed: { opacity: 0.7 },
  section: { gap: spacing.md },
  rows: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  row: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  stateIndicator: { width: 22, height: 22, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 7, borderWidth: 1, borderColor: colors.gray300, backgroundColor: colors.gray100 },
  inventoryControlPressed: { opacity: 0.7 },
  filterMenuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  householdFilterMark: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.pine100, // @kwilt-brand-moment: household filter identity uses the requested pine surface.
  },
  dockActions: {
    position: 'absolute',
    zIndex: 51,
    elevation: 51,
    right: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    bottom: RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.canvas,
    backgroundColor: colors.primary,
  },
  reviewBadgeText: { color: colors.primaryForeground, fontSize: 10, lineHeight: 12 },
  actionLabel: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  claimedMenuAccessory: { alignSelf: 'flex-start', flexShrink: 0 },
});
