import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View, type TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useCapabilityShell } from '../../../navigation/CapabilityShellContext';
import { useCapabilityMenuOpen } from '../../../navigation/CapabilityMenuStateContext';
import { useAppStore } from '../../../store/useAppStore';
import { colors, radii, spacing } from '../../../theme';
import { ActivityListItem } from '../../../ui/ActivityListItem';
import { AlertDialog } from '../../../ui/AlertDialog';
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
import { ChoreCorrectionDrawer } from '../components/ChoreCorrectionDrawer';
import { ChoreEditorDrawer } from '../components/ChoreEditorDrawer';
import { ChoreMemberPill } from '../components/ChoreMemberPill';
import { ChoreReviewDrawer } from '../components/ChoreReviewDrawer';
import { ChoreSettingsDrawer } from '../components/ChoreSettingsDrawer';
import { ChoreRewardsDrawer } from '../components/ChoreRewardsDrawer';
import {
  choreCorrectionEntranceLabel,
  projectCaregiverChoreInventory,
  projectChoreInventory,
  projectChoreCorrectionCandidates,
  projectChoreReviewQueue,
  projectChoreRewards,
  type ChoreMember,
  type ChoreOccurrence,
  type ChoreSeries,
} from '../domain/choreLearning';
import { useChoreLearningStore } from '../runtime/useChoreLearningStore';
import { useActivityBackedChores } from '../runtime/useActivityBackedChores';
import { getImagePickerMediaTypesImages } from '../../../utils/imagePickerMediaTypes';
import { persistImageUri } from '../../../utils/persistImageUri';
import { useToastStore } from '../../../store/useToastStore';
import { QuickAddDock } from '../../../features/activities/QuickAddDock';
import { FloatingDockActionButton } from '../../../features/activities/FloatingDockActionButton';
import { FloatingDockLabeledActionButton } from '../../../features/activities/FloatingDockLabeledActionButton';
import {
  DEFAULT_QUICK_ADD_AI_ACTIONS,
  type QuickAddAiAction,
} from '../../../features/activities/useQuickAddDockController';
import { enrichActivityWithAI } from '../../../services/ai';
import {
  applyChoreDraftEnrichment,
  buildChoreSeriesDeleteSnapshot,
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
import { localDateKey } from '../../../domain/activityRecurrence';
import { HapticsService } from '../../../services/HapticsService';
import { posthogClient } from '../../../services/analytics/posthogClient';
import { track } from '../../../services/analytics/analytics';
import { AnalyticsEvent } from '../../../services/analytics/events';

type ChoresScreenProps = {
  now?: () => Date;
  route?: { params?: { occurrenceId?: string; openEvidencePicker?: boolean } };
};

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
          <Icon
            name="chevronsUpDown"
            size={16}
            color={colors.textSecondary}
            testID="chores.member.switch-icon"
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
        metaLeadingIconName={tokensEnabled ? 'token' : undefined}
        metaLeadingIconSize={20}
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
        metaLeadingIconName={tokensEnabled ? 'token' : undefined}
        metaLeadingIconSize={20}
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

function CaregiverRow({ series, members, tokensEnabled, showAssignee = true, onOpen, onDelete }: {
  series: ChoreSeries;
  members: ChoreMember[];
  tokensEnabled: boolean;
  showAssignee?: boolean;
  onOpen: () => void;
  onDelete: () => void;
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
        metaLeadingAccessory={showAssignee ? (
          <ChoreMemberPill
            accessible={false}
            kind={assignedMember ? 'member' : 'household'}
            name={assignee}
            size="compact"
            testID={assignedMember
              ? `chores.assignee.${assignedMember.id}`
              : 'chores.assignee.household'}
          />
        ) : undefined}
        showPriorityControl={false}
        showCheckbox={false}
        onPress={onOpen}
        onDelete={onDelete}
        rowAccessibilityLabel={`Edit ${series.title}. ${accessibilityMetadata}`}
      />
    </View>
  );
}

type CaregiverChoreFilter = 'all' | 'household' | string;
type CaregiverChoreGrouping = 'member' | 'none';

function CaregiverInventoryControls({ filter, grouping, members, onFilterChange, onGroupingChange }: {
  filter: CaregiverChoreFilter;
  grouping: CaregiverChoreGrouping;
  members: ChoreMember[];
  onFilterChange: (value: CaregiverChoreFilter) => void;
  onGroupingChange: (value: CaregiverChoreGrouping) => void;
}) {
  const selectedMember = members.find((member) => member.id === filter);
  const filterLabel = filter === 'all'
    ? 'All chores'
    : filter === 'household'
      ? 'Household'
      : selectedMember?.displayName ?? 'All chores';
  return (
    <InventoryControlGroup testID="chores.inventory-controls">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Filter chores, ${filterLabel}`}
            hitSlop={5}
            style={({ pressed }) => pressed ? styles.inventoryControlPressed : undefined}
          >
            <InventoryControlSurface
              active={filter !== 'all'}
              count={filter === 'all' ? 0 : 1}
              iconName="funnel"
              testID="chores.inventory-filter"
            />
          </Pressable>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" sideOffset={6} align="start">
          <DropdownMenuLabel>Show chores for</DropdownMenuLabel>
          <DropdownMenuItem
            accessibilityLabel="Show all chores"
            selected={filter === 'all'}
            onPress={() => onFilterChange('all')}
          >
            <Text>All chores</Text>
          </DropdownMenuItem>
          {members.filter((member) => member.role === 'child').map((member) => (
            <DropdownMenuItem
              key={member.id}
              accessibilityLabel={`Show ${member.displayName} chores`}
              selected={filter === member.id}
              onPress={() => onFilterChange(member.id)}
            >
              <View style={styles.filterMenuItem}>
                <ProfileAvatar name={member.displayName} size={24} />
                <Text>{member.displayName}</Text>
              </View>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            accessibilityLabel="Show household chores"
            selected={filter === 'household'}
            onPress={() => onFilterChange('household')}
          >
            <View style={styles.filterMenuItem}>
              <View style={styles.householdFilterMark}>
                <Icon
                  name="home"
                  size={15}
                  color={colors.pine800 /* @kwilt-brand-moment: household filter identity uses the requested pine mark. */}
                />
              </View>
              <Text>Household</Text>
            </View>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={grouping === 'member' ? 'Grouping: Member' : 'Group chores'}
            hitSlop={5}
            style={({ pressed }) => pressed ? styles.inventoryControlPressed : undefined}
          >
            <InventoryControlSurface
              active={grouping !== 'none'}
              count={grouping === 'none' ? 0 : 1}
              iconName="layers"
              testID="chores.inventory-grouping"
            />
          </Pressable>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" sideOffset={6} align="start">
          <DropdownMenuLabel>Group chores by</DropdownMenuLabel>
          <DropdownMenuItem
            accessibilityLabel="Group chores by member"
            selected={grouping === 'member'}
            onPress={() => onGroupingChange('member')}
          >
            <Text>Member</Text>
          </DropdownMenuItem>
          <DropdownMenuItem
            accessibilityLabel="Do not group chores"
            selected={grouping === 'none'}
            onPress={() => onGroupingChange('none')}
          >
            <Text>None</Text>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </InventoryControlGroup>
  );
}

export function ChoresScreen({ now = () => new Date(), route }: ChoresScreenProps) {
  const { openMenu, activeCapabilityId } = useCapabilityShell();
  const capabilityMenuOpen = useCapabilityMenuOpen();
  const authIdentity = useAppStore((state) => state.authIdentity);
  const userProfile = useAppStore((state) => state.userProfile);
  const learningRecord = useChoreLearningStore((state) => state.record);
  const selectMember = useChoreLearningStore((state) => state.selectMember);
  const take = useChoreLearningStore((state) => state.take);
  const release = useChoreLearningStore((state) => state.release);
  const complete = useChoreLearningStore((state) => state.complete);
  const reopen = useChoreLearningStore((state) => state.reopen);
  const setTokensEnabled = useChoreLearningStore((state) => state.setTokensEnabled);
  const setRewardExchangeRate = useChoreLearningStore((state) => state.setRewardExchangeRate);
  const requestRedemption = useChoreLearningStore((state) => state.requestRedemption);
  const cancelRedemption = useChoreLearningStore((state) => state.cancelRedemption);
  const settlePayouts = useChoreLearningStore((state) => state.settlePayouts);
  const approve = useChoreLearningStore((state) => state.approve);
  const requestAnotherPass = useChoreLearningStore((state) => state.requestAnotherPass);
  const requestEarlierCompletions = useChoreLearningStore((state) => state.requestEarlierCompletions);
  const leaveEarlierCompletionMissed = useChoreLearningStore((state) => state.leaveEarlierCompletionMissed);
  const setEvidencePhoto = useChoreLearningStore((state) => state.setEvidencePhoto);
  const addChore = useChoreLearningStore((state) => state.addChore);
  const updateChore = useChoreLearningStore((state) => state.updateChore);
  const deleteChore = useChoreLearningStore((state) => state.deleteChore);
  const restoreChore = useChoreLearningStore((state) => state.restoreChore);
  const reconcileRecurrence = useChoreLearningStore((state) => state.reconcileRecurrence);
  const productionMode = Boolean(authIdentity?.userId);
  const production = useActivityBackedChores(productionMode);
  const record = production.record ?? learningRecord;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [quickAddFocused, setQuickAddFocused] = useState(false);
  const [quickAddAiActions, setQuickAddAiActions] = useState<QuickAddAiAction[]>(
    DEFAULT_QUICK_ADD_AI_ACTIONS,
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [choreDraft, setChoreDraft] = useState<ChoreDraft | null>(null);
  const [enrichingDraft, setEnrichingDraft] = useState(false);
  const [dockReservedHeight, setDockReservedHeight] = useState(0);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatThreadId, setChatThreadId] = useState<string | null>(null);
  const [caregiverFilter, setCaregiverFilter] = useState<CaregiverChoreFilter>('all');
  const [caregiverGrouping, setCaregiverGrouping] = useState<CaregiverChoreGrouping>('member');
  const quickAddInputRef = useRef<TextInput | null>(null);
  const touchedDraftFieldsRef = useRef(new Set<ChoreDraftField>());
  const enrichmentRunRef = useRef(0);
  const evidenceHandoffRef = useRef<string | null>(null);
  const reportedProductionErrorRef = useRef<string | null>(null);
  const projectionNow = now();
  const projectionDateKey = localDateKey(projectionNow);
  const reconciledRecurrenceDateRef = useRef<string | null>(null);
  useEffect(() => {
    if (productionMode) return;
    if (reconciledRecurrenceDateRef.current === projectionDateKey) return;
    reconciledRecurrenceDateRef.current = projectionDateKey;
    reconcileRecurrence(projectionNow.toISOString());
  }, [productionMode, projectionDateKey, projectionNow, reconcileRecurrence]);
  const projection = projectChoreInventory(record, record.activeMemberId, projectionNow);
  const reviewQueue = useMemo(() => projectChoreReviewQueue(record, record.activeMemberId), [record]);
  const selectedOccurrence = record.occurrences.find((item) => item.activityOccurrenceId === selectedOccurrenceId) ?? null;
  useEffect(() => {
    if (!productionMode || !production.record || !production.error) {
      if (!production.error) reportedProductionErrorRef.current = null;
      return;
    }
    if (reportedProductionErrorRef.current === production.error) return;
    reportedProductionErrorRef.current = production.error;
    useToastStore.getState().showToast({
      message: production.error,
      variant: 'danger',
      durationMs: 7000,
      bottomOffset: RESTING_COMPOSER_HEIGHT_PX + spacing.md,
    });
  }, [production.error, production.record, productionMode]);
  useEffect(() => {
    if (!route?.params?.openEvidencePicker || !route.params.occurrenceId) return;
    if (evidenceHandoffRef.current === route.params.occurrenceId) return;
    const target = record.occurrences.find((item) => item.controlId === route.params?.occurrenceId);
    if (target) {
      evidenceHandoffRef.current = route.params.occurrenceId;
      setSelectedOccurrenceId(target.activityOccurrenceId);
    }
  }, [record.occurrences, route?.params?.occurrenceId, route?.params?.openEvidencePicker]);
  const editingSeries = editingSeriesId
    ? record.series.find((series) => series.activitySeriesId === editingSeriesId) ?? null
    : null;
  const correctionCandidates = selectedOccurrence
    ? projectChoreCorrectionCandidates(
      record,
      selectedOccurrence.activityOccurrenceId,
      record.activeMemberId,
      projectionNow,
    )
    : [];
  const correctionEntrance = choreCorrectionEntranceLabel(correctionCandidates, projectionNow);
  const isCaregiver = projection.member.role === 'caregiver';
  const rewards = useMemo(() => (
    isCaregiver
      ? record.members
        .filter((member) => member.role === 'child')
        .map((member) => projectChoreRewards(record, member.id))
      : [projectChoreRewards(record, record.activeMemberId)]
  ), [isCaregiver, record]);
  const pendingPaymentCount = rewards.filter(
    (memberRewards) => memberRewards.pendingPayouts.length > 0,
  ).length;
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
  const caregiverGroups = useMemo(() => {
    if (caregiverGrouping === 'none') return [];
    const memberGroups = record.members
      .filter((member) => member.role === 'child')
      .map((member) => ({
        key: member.id,
        label: member.displayName,
        series: caregiverOccurrences.filter((chore) => chore.assignedMemberId === member.id),
      }))
      .filter((group) => group.series.length > 0);
    const householdSeries = caregiverOccurrences.filter((chore) => chore.assignedMemberId == null);
    return householdSeries.length > 0
      ? [...memberGroups, {
        key: 'household',
        label: 'Household',
        series: householdSeries,
      }]
      : memberGroups;
  }, [caregiverGrouping, caregiverOccurrences, record.members]);
  const completeOccurrence = (id: string) => {
    const occurrence = record.occurrences.find((item) => item.activityOccurrenceId === id);
    if (productionMode && occurrence) {
      void production.complete(occurrence).then((succeeded) => {
        if (succeeded) track(posthogClient, AnalyticsEvent.ChoreCompleted, { storage_mode: 'synced', outcome: 'completed' });
      });
    } else {
      complete(id, now().toISOString());
      track(posthogClient, AnalyticsEvent.ChoreCompleted, { storage_mode: 'local', outcome: 'completed' });
    }
  };
  const closeChoreEditor = () => {
    enrichmentRunRef.current += 1;
    setEnrichingDraft(false);
    setEditorOpen(false);
    setDeleteConfirmOpen(false);
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
      if (productionMode && editingSeries) void production.update(editingSeries, choreDraft);
      else updateChore(editingSeriesId, choreDraft);
      closeChoreEditor();
      return;
    }
    if (productionMode) {
      void production.create(choreDraft).then((succeeded) => {
        if (succeeded) track(posthogClient, AnalyticsEvent.ChoreCreated, { storage_mode: 'synced', outcome: 'created' });
      });
      closeChoreEditor();
      return;
    }
    const createdAt = now();
    addChore(
      choreDraft,
      createdAt.toISOString(),
      `chore-${createdAt.getTime().toString(36)}-${record.occurrences.length + 1}`,
    );
    track(posthogClient, AnalyticsEvent.ChoreCreated, { storage_mode: 'local', outcome: 'created' });
    closeChoreEditor();
  };
  const returnOccurrenceToFamilyList = (id: string) => {
    const occurrence = record.occurrences.find((item) => item.activityOccurrenceId === id);
    if (productionMode && occurrence) {
      void production.release(occurrence);
      return;
    }
    release(id);
    useToastStore.getState().showToast({
      message: 'Returned to the family list',
      variant: 'light',
      actionLabel: 'Undo',
      actionOnPress: () => take(id),
      bottomOffset: RESTING_COMPOSER_HEIGHT_PX + spacing.md,
    });
  };
  const deleteChoreSeries = (series: ChoreSeries) => {
    if (productionMode) {
      void HapticsService.trigger('canvas.destructive.confirm');
      void production.remove(series);
      return;
    }
    const snapshot = buildChoreSeriesDeleteSnapshot(record, series.activitySeriesId);
    if (!snapshot) return;
    void HapticsService.trigger('canvas.destructive.confirm');
    deleteChore(series.activitySeriesId);
    useToastStore.getState().showToast({
      message: 'Chore deleted',
      variant: 'light',
      durationMs: 5000,
      actionLabel: 'Undo',
      actionOnPress: () => {
        restoreChore(snapshot);
        void HapticsService.trigger('canvas.step.undo');
      },
      bottomOffset: RESTING_COMPOSER_HEIGHT_PX + spacing.md,
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
      if (productionMode) {
        await production.addEvidence(occurrence, uri, result.assets?.[0]?.mimeType);
        return;
      }
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

  if (productionMode && !production.record) {
    return (
      <AppShell>
        <PageHeader title="Chores" onPressMenu={openMenu} />
        <View style={styles.productionState}>
          <Heading variant="sm">{production.loading ? 'Loading household chores…' : 'Chores are unavailable'}</Heading>
          {!production.loading ? (
            <>
              <Text tone="secondary">{production.error ?? 'Kwilt could not load the authorized Household Chores record.'}</Text>
              <Button onPress={() => { void production.refresh(); }} variant="outline">Try again</Button>
            </>
          ) : null}
        </View>
      </AppShell>
    );
  }

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
            members={productionMode ? [projection.member] : record.members}
            caregiverAvatarUrl={caregiverAvatarUrl}
            onSelect={productionMode ? () => undefined : selectMember}
          />
        )}
      />
      <CanvasScrollView
        contentContainerStyle={styles.content}
        extraBottomPadding={isCaregiver && reviewQueue.length > 0
          ? Math.max(dockReservedHeight, spacing['3xl'] * 3)
          : isCaregiver
            ? dockReservedHeight
          : record.tokensEnabled
            ? RESTING_COMPOSER_HEIGHT_PX + spacing['2xl']
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
                  onReopen={() => productionMode
                    ? void production.reopen(occurrence)
                    : reopen(occurrence.activityOccurrenceId)}
                  onReturnToFamilyList={() => returnOccurrenceToFamilyList(occurrence.activityOccurrenceId)}
                />
              )) : <Text tone="secondary">Nothing is waiting for you right now.</Text>}
            </View>
          </View>
        ) : null}

        <View style={styles.section} testID="chores.section.household">
          {isCaregiver ? (
            <CaregiverInventoryControls
              filter={caregiverFilter}
              grouping={caregiverGrouping}
              members={record.members}
              onFilterChange={setCaregiverFilter}
              onGroupingChange={setCaregiverGrouping}
            />
          ) : <Heading variant="sm">Choose a chore</Heading>}
          {isCaregiver ? (
            caregiverOccurrences.length ? (
              caregiverGrouping === 'member' ? (
                <View style={styles.caregiverGroups}>
                  {caregiverGroups.map((group) => (
                    <View
                      key={group.key}
                      testID={`chores.group.${group.key}`}
                      style={styles.caregiverGroup}
                    >
                      <Heading variant="sm" accessibilityLabel={`${group.label} chores`}>
                        {group.label}
                      </Heading>
                      <View style={styles.rows}>
                        {group.series.map((series) => (
                          <CaregiverRow
                            key={series.activitySeriesId}
                            series={series}
                            members={record.members}
                            tokensEnabled={record.tokensEnabled}
                            showAssignee={false}
                            onOpen={() => openChoreEditor(series)}
                            onDelete={() => deleteChoreSeries(series)}
                          />
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.rows}>
                  {caregiverOccurrences.map((series) => (
                    <CaregiverRow
                      key={series.activitySeriesId}
                      series={series}
                      members={record.members}
                      tokensEnabled={record.tokensEnabled}
                      onOpen={() => openChoreEditor(series)}
                      onDelete={() => deleteChoreSeries(series)}
                    />
                  ))}
                </View>
              )
            ) : <Text tone="secondary">No chores have been created yet.</Text>
          ) : (
            <View style={styles.rows}>
              {projection.household.length ? projection.household.map((occurrence) => (
                <HouseholdRow
                  key={occurrence.activityOccurrenceId}
                  occurrence={occurrence}
                  tokensEnabled={record.tokensEnabled}
                  onOpen={() => setSelectedOccurrenceId(occurrence.activityOccurrenceId)}
                  onTake={() => productionMode
                    ? void production.claim(occurrence)
                    : take(occurrence.activityOccurrenceId)}
                />
              )) : <Text tone="secondary">No household chores are open right now.</Text>}
            </View>
          )}
        </View>
      </CanvasScrollView>

      {activeCapabilityId === 'chores'
        && !isCaregiver
        && record.tokensEnabled
        && !capabilityMenuOpen
        && !rewardsOpen
        && !correctionOpen
        && selectedOccurrence == null ? (
          <View testID="chores.rewards.dock" style={styles.childDockAction}>
            <FloatingDockLabeledActionButton
              testID="chores.rewards.action"
              accessibilityLabel="My Rewards"
              accessibilityHint="Shows your tokens and redemptions"
              height={RESTING_COMPOSER_HEIGHT_PX}
              icon="token"
              isProminent
              label="My Rewards"
              onPress={() => setRewardsOpen(true)}
            />
          </View>
        ) : null}

      {activeCapabilityId === 'chores'
        && isCaregiver
        && !capabilityMenuOpen
        && !editorOpen
        && !reviewOpen
        && !settingsOpen
        && !rewardsOpen
        && !chatVisible
        && !correctionOpen
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
                + (1 + (reviewQueue.length > 0 ? 1 : 0) + (record.tokensEnabled ? 1 : 0))
                  * (RESTING_COMPOSER_HEIGHT_PX + spacing.sm)}
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
                    <View
                      testID="chores.review.attention-dot"
                      pointerEvents="none"
                      style={styles.reviewBadge}
                    />
                  </View>
                ) : null}
                {record.tokensEnabled ? (
                  <View>
                    <FloatingDockActionButton
                      testID="chores.rewards.action"
                      accessibilityLabel={pendingPaymentCount > 0
                        ? `${pendingPaymentCount} reward ${pendingPaymentCount === 1 ? 'payment' : 'payments'} waiting`
                        : 'Open rewards'}
                      accessibilityHint="Shows household token balances and payouts"
                      icon="token"
                      isProminent
                      onPress={() => setRewardsOpen(true)}
                      size={RESTING_COMPOSER_HEIGHT_PX}
                    />
                    {pendingPaymentCount > 0 ? (
                      <View pointerEvents="none" style={styles.reviewBadge} />
                    ) : null}
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
        occurrence={correctionOpen ? null : selectedOccurrence}
        tokensEnabled={record.tokensEnabled}
        onClose={() => setSelectedOccurrenceId(null)}
        onTake={() => {
          if (selectedOccurrence) {
            if (productionMode) void production.claim(selectedOccurrence);
            else take(selectedOccurrence.activityOccurrenceId);
          }
          setSelectedOccurrenceId(null);
        }}
        onComplete={() => { if (selectedOccurrence) completeOccurrence(selectedOccurrence.activityOccurrenceId); setSelectedOccurrenceId(null); }}
        onReturnToFamilyList={() => { if (selectedOccurrence) returnOccurrenceToFamilyList(selectedOccurrence.activityOccurrenceId); setSelectedOccurrenceId(null); }}
        onTakePhoto={() => { if (selectedOccurrence) void addEvidencePhoto(selectedOccurrence, 'camera'); }}
        onChoosePhoto={() => { if (selectedOccurrence) void addEvidencePhoto(selectedOccurrence, 'library'); }}
        correctionEntranceLabel={correctionEntrance}
        onOpenCorrection={() => setCorrectionOpen(true)}
      />
      <ChoreCorrectionDrawer
        visible={correctionOpen}
        currentOccurrence={selectedOccurrence}
        candidates={correctionCandidates}
        member={projection.member}
        now={projectionNow}
        onSubmit={(ids) => {
          if (productionMode) {
            const occurrences = ids.flatMap((id) => {
              const occurrence = record.occurrences.find((item) => item.activityOccurrenceId === id);
              return occurrence ? [occurrence] : [];
            });
            void production.reportEarlier(occurrences);
            setCorrectionOpen(false);
            setSelectedOccurrenceId(null);
            return;
          }
          requestEarlierCompletions(ids, now().toISOString());
          setCorrectionOpen(false);
          setSelectedOccurrenceId(null);
          useToastStore.getState().showToast({
            message: ids.length === 1
              ? 'Asked a caregiver to count it'
              : `Asked a caregiver to count ${ids.length} days`,
            variant: 'light',
            bottomOffset: RESTING_COMPOSER_HEIGHT_PX + spacing.md,
          });
        }}
        onClose={() => setCorrectionOpen(false)}
      />
      <ChoreRewardsDrawer
        visible={rewardsOpen}
        rewards={rewards}
        isCaregiver={isCaregiver}
        onRequestRedemption={(tokenAmount) => {
          if (productionMode) { void production.reserveReward(tokenAmount); return; }
          const requestedAt = now();
          requestRedemption(
            tokenAmount,
            requestedAt.toISOString(),
            `redemption-${requestedAt.getTime().toString(36)}`,
          );
        }}
        onCancelRedemption={(payoutId) => productionMode
          ? void production.cancelReward(payoutId)
          : cancelRedemption(payoutId, now().toISOString())}
        onSettlePayouts={(payoutIds) => productionMode
          ? void Promise.all(payoutIds.map((payoutId) => production.settleReward(payoutId)))
          : settlePayouts(payoutIds, now().toISOString())}
        onClose={() => setRewardsOpen(false)}
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
        onDelete={editingSeries ? () => setDeleteConfirmOpen(true) : undefined}
        onClose={closeChoreEditor}
      />
      <AlertDialog
        visible={deleteConfirmOpen && editingSeries !== null}
        title="Delete chore?"
        description={editingSeries
          ? `This removes ${editingSeries.title} and all of its occurrences from the household.`
          : undefined}
        cancelLabel="Keep chore"
        actionLabel="Delete chore"
        onClose={() => setDeleteConfirmOpen(false)}
        onCancel={() => setDeleteConfirmOpen(false)}
        onAction={() => {
          if (!editingSeries) return;
          const series = editingSeries;
          closeChoreEditor();
          deleteChoreSeries(series);
        }}
      />
      <ChoreReviewDrawer
        visible={reviewOpen}
        queue={reviewQueue}
        members={record.members}
        tokensEnabled={record.tokensEnabled}
        onApprove={(id) => {
          const occurrence = record.occurrences.find((item) => item.activityOccurrenceId === id);
          if (productionMode && occurrence) void production.approve(occurrence);
          else approve(id, now().toISOString());
        }}
        onAnotherPass={(id, note) => {
          const occurrence = record.occurrences.find((item) => item.activityOccurrenceId === id);
          if (productionMode && occurrence) void production.returnForAnotherPass(occurrence, note);
          else requestAnotherPass(id, now().toISOString(), note);
        }}
        onLeaveEarlierMissed={(id) => {
          const occurrence = record.occurrences.find((item) => item.activityOccurrenceId === id);
          if (productionMode && occurrence) void production.leaveMissed(occurrence);
          else leaveEarlierCompletionMissed(id, now().toISOString());
        }}
        onClose={() => setReviewOpen(false)}
      />
      <ChoreSettingsDrawer
        visible={settingsOpen}
        tokensEnabled={record.tokensEnabled}
        rewardExchangeRateCentsPerToken={record.rewardExchangeRateCentsPerToken}
        onChangeTokens={(enabled) => productionMode
          ? void production.configureReward({ enabled })
          : setTokensEnabled(enabled)}
        onChangeRewardExchangeRate={(centsPerToken) => productionMode
          ? void production.configureReward({ centsPerToken })
          : setRewardExchangeRate(centsPerToken)}
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
  productionState: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  content: { gap: spacing['2xl'], paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  memberControl: { height: 32, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.gray100 },
  memberMenu: { minWidth: 220 },
  memberMenuItemContent: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pressed: { opacity: 0.7 },
  section: { gap: spacing.md },
  caregiverGroups: { gap: spacing.xl },
  caregiverGroup: { gap: spacing.sm },
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
  childDockAction: {
    position: 'absolute',
    zIndex: 51,
    elevation: 51,
    left: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    bottom: RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX,
  },
  reviewBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.canvas,
    backgroundColor: colors.actionAttention,
  },
  actionLabel: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  claimedMenuAccessory: { alignSelf: 'flex-start', flexShrink: 0 },
});
