import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Keyboard, View } from "react-native";
import Reanimated, {
  Easing,
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { colors } from "../../../theme";
import { HapticsService } from "../../../services/HapticsService";
import {
  BottomDrawer,
  BottomDrawerScrollView,
  useBottomDrawerActionDockClearance,
} from "../../../ui/BottomDrawer";
import { Button, IconButton } from "../../../ui/Button";
import { DraggableList } from "../../../ui/DraggableList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../ui/DropdownMenu";
import { Icon } from "../../../ui/Icon";
import { EmptyState } from "../../../ui/EmptyState";
import { Input } from "../../../ui/Input";
import { AlertDialog } from "../../../ui/AlertDialog";
import { Coachmark } from "../../../ui/Coachmark";
import { DrawerDestinationAction } from "../../../ui/DrawerDestinationAction";
import { useAccessibilityPreferences } from "../../../ui/hooks/useAccessibilityPreferences";
import { BottomDrawerHeader } from "../../../ui/layout/BottomDrawerHeader";
import { ButtonLabel, Heading, Text } from "../../../ui/Typography";
import {
  PLAN_HARD_PASS_REACTION,
  PLAN_NEGATIVE_REACTION_OPTIONS,
  PLAN_POSITIVE_REACTION_OPTIONS,
  PLAN_REACTION_OPTIONS,
  type PlanReaction,
  type PlanReactionCounts,
} from "../../meal-planning/domain/sharedMealCart";
import {
  getMealPlanDropSection,
  hasCompleteMealPlanOrder,
  type MealPlanDropSection,
} from "../../meal-planning/domain/mealPlanDrag";
import { getPlanLifecycleSignature, getPlanOrderSignature, reconcilePlanCandidateOrder, type PlanLifecycle } from "../../meal-planning/domain/planLifecycle";
import { RecipeArtwork } from "../components/RecipeArtwork";
import { styles } from "./RecipeLibraryScreen.styles";

const HOUSEHOLD_FOOD_EMPTY_ILLUSTRATION = require("../../../../assets/illustrations/groceries-empty.png");
const REACTION_SELECTION_HOLD_MS = 180;
const PLAN_ACTION_SHARE_OFFSET_PX = 96;
const PLAN_ACTION_SHARE_DURATION_MS = 220;
const HARD_PASS_REASON_OPTIONS = [
  "Allergy",
  "Dietary need",
  "Don't like it",
  "Too spicy",
  "Texture",
] as const;
type HardPassReasonOption = typeof HARD_PASS_REASON_OPTIONS[number] | "Other";
type PlanPerson = { personId: string; displayName: string; avatarUrl: string | null };
type PlanSupporter = PlanPerson & { reaction: PlanReaction; reason?: string | null };

export type MealPlanTrayItem = {
  id: string;
  candidateId: string;
  title: string;
  storageRef: string | null;
  lifecycle: PlanLifecycle;
  createdAt: string;
  sentAt: string | null;
  voteCount: number;
  downvoteCount?: number;
  hardPassCount?: number;
  requiresHardPassReview?: boolean;
  missingItemCount: number | null;
  contributor?: PlanPerson;
  supporters?: PlanSupporter[];
  reactionCounts?: PlanReactionCounts;
  viewerReaction?: PlanReaction | null;
  viewerReactionReason?: string | null;
  canReact?: boolean;
  canRemove?: boolean;
  canMarkMade?: boolean;
};

function PlanReactionPill({
  item,
  reaction,
  onReact,
  reacting,
}: {
  item: MealPlanTrayItem;
  reaction: typeof PLAN_REACTION_OPTIONS[number];
  onReact?(candidateId: string, reaction: PlanReaction | null, reason?: string | null): void;
  reacting: boolean;
}) {
  const count = item.reactionCounts?.[reaction.id] ?? 0;
  if (count === 0) return null;
  const selected = item.viewerReaction === reaction.id;
  const people = item.supporters?.filter((supporter) => supporter.reaction === reaction.id) ?? [];
  const trigger = (
    <Pressable
      style={({ pressed }) => [
        styles.planReactionPill,
        selected ? styles.planReactionPillSelected : styles.planReactionPillIdle,
        pressed && styles.pressed,
      ]}
      accessibilityLabel={`${reaction.label} ${item.title}, ${count}`}
      accessibilityHint={selected ? "Removes your reaction" : "Shows who reacted"}
      accessibilityState={{ selected }}
      accessibilityValue={{ text: `${count} ${reaction.label.toLowerCase()} ${count === 1 ? "reaction" : "reactions"}` }}
      disabled={reacting}
      hitSlop={6}
      onPress={selected && item.canReact && onReact ? () => {
        void HapticsService.trigger("canvas.toggle.off");
        onReact(item.candidateId, null);
      } : undefined}
    >
      <View style={styles.planReactionPillContent}>
        <Text style={styles.planReactionEmoji}>{reaction.emoji}</Text>
        <Text variant="label">{count}</Text>
      </View>
    </Pressable>
  );
  if (selected) return trigger;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" sideOffset={6} style={styles.planPeopleMenu}>
        <Text variant="label">{reaction.emoji} {reaction.label}</Text>
        {people.map((person) => (
          <Text key={person.personId} tone="secondary">
            {person.reason ? `${person.displayName}: “${person.reason}”` : person.displayName}
          </Text>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PlanReactionBar({
  item,
  onReact,
  onAdd,
  reacting,
}: {
  item: MealPlanTrayItem;
  onReact?(candidateId: string, reaction: PlanReaction | null, reason?: string | null): void;
  onAdd(item: MealPlanTrayItem): void;
  reacting: boolean;
}) {
  return (
    <View style={styles.planReactionBar}>
      {PLAN_REACTION_OPTIONS.map((reaction) => (
        <PlanReactionPill key={reaction.id} item={item} reaction={reaction} onReact={onReact} reacting={reacting} />
      ))}
      {item.canReact && onReact && !item.viewerReaction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`React to ${item.title}`}
          accessibilityHint="Choose an emoji reaction"
          disabled={reacting}
          onPress={() => onAdd(item)}
          hitSlop={8}
          style={({ pressed }) => [styles.planResponseAction, pressed && styles.pressed]}
        >
          <Icon testID={`plan-positive-reaction-icon-${item.candidateId}`} name="smilePlus" size={17} color={colors.textSecondary} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
}

type MealMoveDirection = "addToGroceries" | "returnToPlan";

type MealPlanListEntry =
  | { kind: "meal"; id: string; item: MealPlanTrayItem }
  | { kind: "getIdeas"; id: "get-ideas-from-kwilt" }
  | { kind: "plannedHeading"; id: "planned-heading" }
  | { kind: "plannedEmpty"; id: "planned-empty" };

type MealPlanActiveDrag = {
  source: MealPlanDropSection;
  originalDisplayIds: string[];
};

function KwiltIdeasAction({
  label,
  loading,
  disabled,
  onPress,
  empty = false,
}: {
  label: string;
  loading: boolean;
  disabled?: boolean;
  onPress(): void;
  empty?: boolean;
}) {
  return (
    <Button
      accessibilityLabel={label}
      accessibilityHint="Adds up to three recommended meals to Ideas"
      variant="ghost"
      size="sm"
      fullWidth={!empty}
      loading={loading}
      disabled={disabled}
      loadingLabel="Getting ideas…"
      onPress={onPress}
      style={empty ? undefined : styles.planGetIdeasOffer}
    >
      <View style={styles.planGetIdeasContent}>
        <Icon name="sparkles" size={16} color={colors.textSecondary} />
        <ButtonLabel>{label}</ButtonLabel>
      </View>
    </Button>
  );
}

function MealPlanDropSurface({
  children,
  destinationSection,
  section,
  style,
}: {
  children: React.ReactNode;
  destinationSection: SharedValue<number>;
  section: MealPlanDropSection;
  style?: object;
}) {
  const sectionIndex = section === "ideas" ? 0 : 1;
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: destinationSection.value === sectionIndex ? colors.fieldFill : colors.canvas,
  }));
  return <Reanimated.View style={[style, animatedStyle]}>{children}</Reanimated.View>;
}

function MealMoveHandle({
  item,
  direction,
  renderDragHandle,
  onMove,
}: {
  item: MealPlanTrayItem;
  direction: MealMoveDirection;
  renderDragHandle(handle: React.ReactElement): React.ReactElement;
  onMove(): void;
}) {
  const actionLabel = direction === "addToGroceries" ? "Move to Planned" : "Return to Meal ideas";
  return renderDragHandle(
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Move ${item.title}`}
      accessibilityHint={`Drag to ${actionLabel.toLowerCase()}. Double tap to move now.`}
      accessibilityActions={[{ name: direction, label: actionLabel }]}
      hitSlop={6}
      onPress={onMove}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === direction) onMove();
      }}
      style={({ pressed }) => [styles.planMoveHandle, pressed && styles.pressed]}
    >
      <Icon name="menu" size={19} color={colors.textSecondary} />
    </Pressable>
  );
}

export function MealPlanDrawer({
  visible,
  items,
  canManage,
  onClose,
  onRemove,
  onReact,
  onSharePlan,
  guestSuggestions,
  shareBusy,
  shareSheetVisible,
  hasActiveGuestLink,
  onTurnOffGuestLink,
  onSendToGroceries,
  onReturnToPlan,
  onMarkMade,
  onOpenGroceries,
  reactingCandidateIds,
  guideStep,
  onGuideAdvance,
  onGetIdeas,
  gettingIdeas = false,
  getIdeasDisabled = false,
}: {
  visible: boolean;
  items: MealPlanTrayItem[];
  canManage: boolean;
  onClose(): void;
  onRemove(item: MealPlanTrayItem): void;
  onReact?(candidateId: string, reaction: PlanReaction | null, reason?: string | null): void;
  onSharePlan?(): void;
  guestSuggestions?: Array<{ id: string; displayName: string | null; suggestion: string }>;
  shareBusy?: boolean;
  shareSheetVisible?: boolean;
  hasActiveGuestLink?: boolean;
  onTurnOffGuestLink?(): void;
  onSendToGroceries?(candidateIds: string[], options?: { acknowledgeHardPasses?: boolean }): unknown;
  onReturnToPlan?(candidateId: string): unknown;
  onMarkMade?(candidateId: string): void;
  onOpenGroceries?(): void;
  reactingCandidateIds?: ReadonlySet<string>;
  guideStep?: 'share-plan' | 'send-to-groceries' | null;
  onGuideAdvance?(event: 'sharing-opened' | 'sharing-skipped'): void;
  onGetIdeas?(): Promise<boolean> | boolean;
  gettingIdeas?: boolean;
  getIdeasDisabled?: boolean;
}) {
  const actionDockClearance = useBottomDrawerActionDockClearance();
  const [displayIds, setDisplayIds] = useState<string[]>([]);
  const [reactionPickerItem, setReactionPickerItem] = useState<MealPlanTrayItem | null>(null);
  const [reactionGuideVisible, setReactionGuideVisible] = useState(false);
  const [stagedReaction, setStagedReaction] = useState<PlanReaction | null>(null);
  const [hardPassReasonOption, setHardPassReasonOption] = useState<HardPassReasonOption | null>(null);
  const [hardPassReason, setHardPassReason] = useState("");
  const [pendingHardPassSendIds, setPendingHardPassSendIds] = useState<string[] | null>(null);
  const [guideSendStarted, setGuideSendStarted] = useState(false);
  const [optimisticLifecycle, setOptimisticLifecycle] = useState<Record<string, PlanLifecycle>>({});
  const [dragListRevision, setDragListRevision] = useState(0);
  const [hasRequestedKwiltIdeas, setHasRequestedKwiltIdeas] = useState(false);
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const wasVisibleRef = useRef(false);
  const lifecycleSignatureRef = useRef("");
  const orderSignatureRef = useRef("");
  const reactionSelectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareTargetRef = useRef<View>(null);
  const groceryTargetRef = useRef<View>(null);
  const dragStateRef = useRef<MealPlanActiveDrag | null>(null);
  const dragDestinationSection = useSharedValue(-1);
  const planActionVisibility = useSharedValue(shareSheetVisible ? 0 : 1);
  const planActionAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{
      translateY: (1 - planActionVisibility.value) * PLAN_ACTION_SHARE_OFFSET_PX,
    }],
  }));

  useLayoutEffect(() => {
    planActionVisibility.value = withTiming(shareSheetVisible ? 0 : 1, {
      duration: reduceMotionEnabled ? 0 : PLAN_ACTION_SHARE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [planActionVisibility, reduceMotionEnabled, shareSheetVisible]);

  useEffect(() => () => {
    if (reactionSelectionTimerRef.current) clearTimeout(reactionSelectionTimerRef.current);
  }, []);

  useEffect(() => {
    if (!visible) {
      wasVisibleRef.current = false;
      lifecycleSignatureRef.current = "";
      orderSignatureRef.current = "";
      setReactionPickerItem(null);
      setReactionGuideVisible(false);
      setStagedReaction(null);
      setHardPassReasonOption(null);
      setHardPassReason("");
      setPendingHardPassSendIds(null);
      setGuideSendStarted(false);
      setOptimisticLifecycle({});
      setHasRequestedKwiltIdeas(false);
      dragStateRef.current = null;
      dragDestinationSection.value = -1;
      return;
    }
    const lifecycleSignature = getPlanLifecycleSignature(items);
    const orderSignature = getPlanOrderSignature(items);
    const reason = !wasVisibleRef.current
      ? "open"
      : lifecycleSignatureRef.current !== lifecycleSignature
        ? "lifecycle"
        : orderSignatureRef.current !== orderSignature
          ? "reaction"
          : null;
    if (reason) setDisplayIds((current) => reconcilePlanCandidateOrder(current, items, reason));
    lifecycleSignatureRef.current = lifecycleSignature;
    orderSignatureRef.current = orderSignature;
    wasVisibleRef.current = true;
  }, [dragDestinationSection, items, visible]);

  useEffect(() => {
    setOptimisticLifecycle((current) => {
      const pending = Object.entries(current);
      if (!pending.length) return current;
      const next = { ...current };
      let changed = false;
      for (const [candidateId, lifecycle] of pending) {
        if (items.some((item) => item.candidateId === candidateId && item.lifecycle === lifecycle)) {
          delete next[candidateId];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [items]);

  const displayItems = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    const hasCompleteLocalOrder = hasCompleteMealPlanOrder(displayIds, items);
    const effectiveIds = hasCompleteLocalOrder
      ? displayIds
      : reconcilePlanCandidateOrder([], items, "open");
    return effectiveIds.flatMap((id) => {
      const item = byId.get(id);
      if (!item) return [];
      const lifecycle = optimisticLifecycle[item.candidateId];
      return [{ ...item, ...(lifecycle ? { lifecycle } : null) }];
    });
  }, [displayIds, items, optimisticLifecycle]);
  const ideas = displayItems.filter((item) => item.lifecycle === "idea");
  const groceries = displayItems.filter((item) => item.lifecycle !== "idea");
  const dragEntries = useMemo<MealPlanListEntry[]>(() => {
    if (!displayItems.length) return [];
    return [
      ...ideas.map((item) => ({ kind: "meal" as const, id: item.id, item })),
      ...(onGetIdeas ? [{ kind: "getIdeas" as const, id: "get-ideas-from-kwilt" as const }] : []),
      { kind: "plannedHeading" as const, id: "planned-heading" as const },
      ...groceries.map((item) => ({ kind: "meal" as const, id: item.id, item })),
      ...(groceries.length ? [] : [{ kind: "plannedEmpty" as const, id: "planned-empty" as const }]),
    ];
  }, [displayItems, groceries, ideas, onGetIdeas]);
  const getIdeasLabel = hasRequestedKwiltIdeas ? "Suggest more meals" : "Suggest meals";
  const requestKwiltIdeas = async () => {
    if (!onGetIdeas || gettingIdeas) return;
    try {
      const added = await onGetIdeas();
      if (added) setHasRequestedKwiltIdeas(true);
    } catch {
      // The screen owns user-facing failure feedback.
    }
  };
  const finishSend = (candidateIds: string[], acknowledgeHardPasses = false) => {
    if (acknowledgeHardPasses) {
      const result = onSendToGroceries?.(candidateIds, { acknowledgeHardPasses: true });
      setPendingHardPassSendIds(null);
      return result;
    }
    const result = onSendToGroceries?.(candidateIds);
    setPendingHardPassSendIds(null);
    return result;
  };
  const requestSend = (candidateIds: string[]) => {
    const needsReview = candidateIds.some((candidateId) =>
      items.some((item) => item.candidateId === candidateId && item.requiresHardPassReview),
    );
    if (needsReview) {
      setPendingHardPassSendIds(candidateIds);
      return null;
    }
    return finishSend(candidateIds);
  };
  const pendingHardPassItems = pendingHardPassSendIds
    ? items.filter((item) => pendingHardPassSendIds.includes(item.candidateId) && item.requiresHardPassReview)
    : [];
  const hardPassReviewDescription = pendingHardPassItems.flatMap((item) => {
    const reactions = item.supporters?.filter((supporter) => supporter.reaction === "hard_pass") ?? [];
    return reactions.length
      ? reactions.map((supporter) => supporter.reason
        ? `${supporter.displayName}: “${supporter.reason}”`
        : `${supporter.displayName} hard-passed ${item.title}.`)
      : [`Someone hard-passed ${item.title}.`];
  }).join("\n");
  const openReactionPicker = (item: MealPlanTrayItem) => {
    if (reactionSelectionTimerRef.current) clearTimeout(reactionSelectionTimerRef.current);
    reactionSelectionTimerRef.current = null;
    setReactionPickerItem(item);
    setStagedReaction(null);
    setHardPassReasonOption(null);
    setHardPassReason("");
    setReactionGuideVisible(true);
  };
  const closeReactionPicker = () => {
    if (reactionSelectionTimerRef.current) clearTimeout(reactionSelectionTimerRef.current);
    reactionSelectionTimerRef.current = null;
    setReactionGuideVisible(false);
  };
  const selectOrdinaryReaction = (reaction: PlanReaction) => {
    if (!reactionPickerItem) return;
    if (reactionSelectionTimerRef.current) clearTimeout(reactionSelectionTimerRef.current);
    setStagedReaction(reaction);
    void HapticsService.trigger("canvas.toggle.on");
    reactionSelectionTimerRef.current = setTimeout(() => {
      reactionSelectionTimerRef.current = null;
      onReact?.(reactionPickerItem.candidateId, reaction);
      closeReactionPicker();
    }, reduceMotionEnabled ? 0 : REACTION_SELECTION_HOLD_MS);
  };
  const toggleHardPass = () => {
    if (reactionSelectionTimerRef.current) clearTimeout(reactionSelectionTimerRef.current);
    reactionSelectionTimerRef.current = null;
    if (stagedReaction === PLAN_HARD_PASS_REACTION.id) {
      setStagedReaction(null);
      setHardPassReasonOption(null);
      setHardPassReason("");
      void HapticsService.trigger("canvas.toggle.off");
      return;
    }
    setStagedReaction(PLAN_HARD_PASS_REACTION.id);
    void HapticsService.trigger("canvas.toggle.on");
  };
  const saveHardPass = () => {
    if (!reactionPickerItem) return;
    onReact?.(
      reactionPickerItem.candidateId,
      PLAN_HARD_PASS_REACTION.id,
      hardPassReasonOption === "Other"
        ? hardPassReason.trim() || null
        : hardPassReasonOption,
    );
    setReactionGuideVisible(false);
    setReactionPickerItem(null);
    setStagedReaction(null);
    setHardPassReasonOption(null);
    setHardPassReason("");
  };
  const handleDragBegin = (from: number) => {
    const entry = dragEntries[from];
    if (!entry || entry.kind !== "meal") return;
    const source: MealPlanDropSection = entry.item.lifecycle === "idea" ? "ideas" : "planned";
    dragStateRef.current = {
      source,
      originalDisplayIds: displayItems.map((item) => item.id),
    };
    dragDestinationSection.value = -1;
  };
  const handleDragPositionChange = (from: number, to: number) => {
    const current = dragStateRef.current;
    if (!current) return;
    const destination = getMealPlanDropSection(dragEntries, from, to);
    dragDestinationSection.value = destination === current.source ? -1 : destination === "ideas" ? 0 : 1;
    void HapticsService.trigger("canvas.drag.position");
  };
  const clearDragFeedback = () => {
    dragStateRef.current = null;
    dragDestinationSection.value = -1;
  };
  const clearOptimisticMove = (candidateId: string, originalDisplayIds: string[]) => {
    setOptimisticLifecycle((current) => {
      if (!(candidateId in current)) return current;
      const next = { ...current };
      delete next[candidateId];
      return next;
    });
    setDisplayIds(originalDisplayIds);
    setDragListRevision((current) => current + 1);
  };
  const observeMoveResult = (candidateId: string, result: unknown, originalDisplayIds: string[]) => {
    if (!result || typeof (result as Promise<unknown>).then !== "function") return;
    void (result as Promise<unknown>).then((receipt) => {
      if (receipt == null || receipt === false) {
        clearOptimisticMove(candidateId, originalDisplayIds);
        void HapticsService.trigger("outcome.error");
      }
    }).catch(() => {
      clearOptimisticMove(candidateId, originalDisplayIds);
      void HapticsService.trigger("outcome.error");
    });
  };
  const handleOrderChange = (
    orderedIds: string[],
    { fromIndex: from, toIndex: to }: { fromIndex: number; toIndex: number },
  ) => {
    const entriesById = new Map(dragEntries.map((candidate) => [candidate.id, candidate]));
    const data = orderedIds.flatMap((id) => entriesById.get(id) ?? []);
    const entry = dragEntries[from];
    const destination = getMealPlanDropSection(dragEntries, from, to);
    const originalDisplayIds = dragStateRef.current?.originalDisplayIds
      ?? displayItems.map((item) => item.id);
    dragStateRef.current = null;
    dragDestinationSection.value = -1;
    if (!entry || entry.kind !== "meal") return;
    const source: MealPlanDropSection = entry.item.lifecycle === "idea" ? "ideas" : "planned";
    if (source === destination) {
      setDisplayIds(data.flatMap((candidate) => candidate.kind === "meal" ? [candidate.item.id] : []));
      void HapticsService.trigger("canvas.primary.confirm");
      return;
    }
    if (destination === "planned" && entry.item.requiresHardPassReview) {
      requestSend([entry.item.candidateId]);
      setDragListRevision((current) => current + 1);
      return;
    }
    const nextLifecycle: PlanLifecycle = destination === "planned" ? "sent" : "idea";
    setDisplayIds(data.flatMap((candidate) => candidate.kind === "meal" ? [candidate.item.id] : []));
    setOptimisticLifecycle((current) => ({ ...current, [entry.item.candidateId]: nextLifecycle }));
    void HapticsService.trigger(destination === "planned" ? "canvas.toggle.on" : "canvas.toggle.off");
    if (destination === "planned") {
      observeMoveResult(entry.item.candidateId, requestSend([entry.item.candidateId]), originalDisplayIds);
    } else {
      observeMoveResult(entry.item.candidateId, onReturnToPlan?.(entry.item.candidateId), originalDisplayIds);
    }
  };

  return (
    <>
      <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={["100%"]}
      snapIndex={0}
      presentation="inline"
      keyboardAvoidanceEnabled={false}
      enableContentPanningGesture={false}
      contentExtendsIntoBottomSafeArea
      contentLayout="edgeToEdge"
      sheetStyle={styles.planDrawerSheet}
      handleContainerStyle={styles.planDrawerHandleRegion}
      actionDock={onOpenGroceries ? (
        <Reanimated.View
          testID="plan-grocery-action-transition"
          accessibilityElementsHidden={shareSheetVisible}
          importantForAccessibility={shareSheetVisible ? "no-hide-descendants" : "auto"}
          pointerEvents={shareSheetVisible ? "none" : "auto"}
          style={planActionAnimatedStyle}
        >
          <DrawerDestinationAction
            testID="plan-view-groceries"
            accessibilityLabel="View groceries"
            accessibilityHint="Opens the grocery list compiled from planned meals"
            label="View groceries"
            leadingIcon="cart"
            onPress={onOpenGroceries}
          />
        </Reanimated.View>
      ) : undefined}
    >
      <View style={styles.planDrawerViewport}>
        <BottomDrawerHeader
          variant="default"
          containerStyle={styles.planDrawerHeader}
          rightAction={onSharePlan ? (
            <View ref={shareTargetRef} collapsable={false}>
              <Button
                accessibilityLabel="Share Plan"
                accessibilityHint="Opens the system share sheet with a guest feedback link"
                variant="ghost"
                size="sm"
                disabled={shareBusy}
                onPress={onSharePlan}
              >
                <View style={styles.planDrawerShareActionContent}>
                  <Icon testID="plan-share-icon" name="share" size={18} color={colors.textPrimary} />
                  <ButtonLabel>Share</ButtonLabel>
                </View>
              </Button>
            </View>
          ) : undefined}
          title={(
            <View testID="plan-drawer-title-cluster" style={styles.planDrawerHeaderMain}>
              <View
                accessible
                accessibilityRole="header"
                accessibilityLabel={`Meal plan, ${items.length} ${items.length === 1 ? "meal" : "meals"}`}
                style={styles.planDrawerTitleIdentity}
              >
                <Icon testID="plan-drawer-header-icon" name="meal" size={24} color={colors.textPrimary} />
                <Heading variant="lg">Meal plan</Heading>
              </View>
              {hasActiveGuestLink && onTurnOffGuestLink ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconButton accessibilityLabel="Guest link options" variant="ghost">
                      <Icon name="more" size={18} color={colors.textPrimary} />
                    </IconButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="bottom" sideOffset={6} align="start">
                    <DropdownMenuItem
                      label="Turn off guest link"
                      icon="link"
                      variant="destructive"
                      onPress={onTurnOffGuestLink}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </View>
          )}
        />
        <View style={styles.planIdeasIntroduction}>
          <Heading variant="sm">Ideas</Heading>
          <Text tone="secondary">Meals you’re considering. Add any recipe with +, or ask Kwilt.</Text>
        </View>
        <DraggableList
          key={`meal-plan-drag-list-${dragListRevision}`}
          activationMode="handle"
          contentContainerStyle={styles.planDrawerContent}
          extraBottomPadding={onOpenGroceries ? actionDockClearance : 0}
          items={dragEntries}
          onDragStart={handleDragBegin}
          onDragPositionChange={handleDragPositionChange}
          onDragEnd={(from, to) => {
            dragDestinationSection.value = -1;
            if (from === to) dragStateRef.current = null;
          }}
          onDragCancel={clearDragFeedback}
          onOrderChange={handleOrderChange}
          reportDraggingOnJS={false}
          ListEmptyComponent={(
            <EmptyState
              variant="screen"
              illustration={HOUSEHOLD_FOOD_EMPTY_ILLUSTRATION}
              title="Add a meal idea"
              actions={onGetIdeas ? (
                <KwiltIdeasAction
                  label={getIdeasLabel}
                  loading={gettingIdeas}
                  disabled={getIdeasDisabled}
                  onPress={() => { void requestKwiltIdeas(); }}
                  empty
                />
              ) : undefined}
              style={styles.planDrawerEmpty}
            />
          )}
          ListFooterComponent={guestSuggestions?.length ? (
            <View style={styles.planGuestSuggestions}>
              <Text variant="label" tone="secondary">Guest suggestions</Text>
              {guestSuggestions.map((response) => (
                <Text key={response.id} tone="secondary">
                  {response.displayName || "Guest"} · “{response.suggestion}”
                </Text>
              ))}
            </View>
          ) : null}
          renderItem={(entry, _isDragging, _index, renderDragHandle) => {
            if (entry.kind === "getIdeas") {
              return (
                <View style={styles.planGetIdeasRow}>
                  <KwiltIdeasAction
                    label={getIdeasLabel}
                    loading={gettingIdeas}
                    disabled={getIdeasDisabled}
                    onPress={() => { void requestKwiltIdeas(); }}
                  />
                </View>
              );
            }
            if (entry.kind === "plannedHeading") {
              return (
                <MealPlanDropSurface
                  destinationSection={dragDestinationSection}
                  section="planned"
                  style={styles.planPlannedSectionHeading}
                >
                  <View ref={groceryTargetRef} collapsable={false} testID="plan-planned-drop-zone">
                    <Heading variant="sm">Planned</Heading>
                  </View>
                </MealPlanDropSurface>
              );
            }
            if (entry.kind === "plannedEmpty") {
              return (
                <MealPlanDropSurface
                  destinationSection={dragDestinationSection}
                  section="planned"
                  style={styles.planPlannedEmpty}
                >
                  <Text tone="secondary">Drag a meal here when you’re ready to plan it.</Text>
                </MealPlanDropSurface>
              );
            }

            const { item } = entry;
            const section: MealPlanDropSection = item.lifecycle === "idea" ? "ideas" : "planned";
            const direction: MealMoveDirection = section === "ideas" ? "addToGroceries" : "returnToPlan";
            const canMove = canManage && (section === "ideas" ? Boolean(onSendToGroceries) : Boolean(onReturnToPlan));
            const moveNow = section === "ideas"
              ? () => requestSend([item.candidateId])
              : () => onReturnToPlan?.(item.candidateId);
            return (
              <MealPlanDropSurface
                destinationSection={dragDestinationSection}
                section={section}
                style={styles.planDragMealCell}
              >
                <View
                  testID={section === "ideas" ? `plan-row-${item.candidateId}` : `plan-grocery-row-${item.candidateId}`}
                  style={styles.planDrawerMainRow}
                >
                  {canMove ? (
                    <MealMoveHandle
                      key={`${item.id}-${direction}`}
                      item={item}
                      direction={direction}
                      renderDragHandle={renderDragHandle}
                      onMove={moveNow}
                    />
                  ) : null}
                  <View style={section === "ideas" ? styles.planDrawerArtworkFrame : styles.planPlannedMealArtworkFrame}>
                    <RecipeArtwork
                      storageRef={item.storageRef}
                      accessibilityLabel={item.title}
                      style={section === "ideas" ? styles.planDrawerArtwork : styles.planPlannedMealArtwork}
                    />
                  </View>
                  <View testID={`plan-copy-${item.candidateId}`} style={styles.planDrawerMealCopy}>
                    <Text testID={`plan-title-${item.candidateId}`} style={styles.planDrawerTitle}>{item.title}</Text>
                    <View testID={`plan-reaction-row-${item.candidateId}`} style={styles.planDrawerReactionRow}>
                      <PlanReactionBar
                        item={item}
                        onReact={onReact}
                        onAdd={openReactionPicker}
                        reacting={Boolean(reactingCandidateIds?.has(item.candidateId))}
                      />
                    </View>
                  </View>
                  {canManage && item.canRemove && section === "ideas" ? (
                    <IconButton
                      accessibilityLabel={`Remove ${item.title} from Meal ideas`}
                      variant="ghost"
                      style={styles.planDrawerMore}
                      onPress={() => onRemove(item)}
                    >
                      <Icon testID={`plan-remove-minus-${item.candidateId}`} name="minus" size={19} color={colors.textSecondary} />
                    </IconButton>
                  ) : canManage && item.canRemove ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <IconButton accessibilityLabel={`More actions for ${item.title}`} variant="ghost"><Icon name="more" size={18} color={colors.textSecondary} /></IconButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="top" align="end">
                        {item.canMarkMade && onMarkMade ? <DropdownMenuItem label="Made" icon="checkCircle" onPress={() => onMarkMade(item.candidateId)} /> : null}
                        {item.canMarkMade && onMarkMade ? <DropdownMenuSeparator /> : null}
                        {onReturnToPlan ? <DropdownMenuItem label="Return to Meal ideas" icon="undo" onPress={() => onReturnToPlan(item.candidateId)} /> : null}
                        {onReturnToPlan ? <DropdownMenuSeparator /> : null}
                        <DropdownMenuItem label="Remove from Meal ideas" icon="minus" onPress={() => onRemove(item)} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </View>
              </MealPlanDropSurface>
            );
          }}
        />
      </View>
      </BottomDrawer>
      {guideStep === 'share-plan' ? <Coachmark
        visible={visible && guideStep === 'share-plan' && Boolean(onSharePlan) && !shareSheetVisible}
        targetRef={shareTargetRef}
        title={<Text style={{ fontWeight: '700' }}>Want a quick gut check?</Text>}
        body={<Text tone="secondary">Share this Plan for feedback. It won’t add anyone to your Household.</Text>}
        actions={[
          { id: 'share', label: 'Share Plan', variant: 'accent' },
          { id: 'skip', label: 'Not now', variant: 'ghost' },
        ]}
        spotlight="hole"
        spotlightRadius="auto"
        placement="below"
        onAction={(actionId) => {
          if (actionId === 'share') {
            onGuideAdvance?.('sharing-opened');
            onSharePlan?.();
          } else {
            onGuideAdvance?.('sharing-skipped');
          }
        }}
        onDismiss={() => onGuideAdvance?.('sharing-skipped')}
      /> : null}
      {guideStep === 'send-to-groceries' ? <Coachmark
        visible={visible && guideStep === 'send-to-groceries' && !guideSendStarted}
        targetRef={groceryTargetRef}
        title={<Text style={{ fontWeight: '700' }}>Make one grocery list</Text>}
        body={<Text tone="secondary">Drag a meal into Planned when you’re ready to make it.</Text>}
        actions={[
          { id: 'got-it', label: 'Got it', variant: 'accent' },
        ]}
        spotlight="hole"
        spotlightRadius="auto"
        placement="above"
        onAction={() => {
          setGuideSendStarted(true);
        }}
        onDismiss={() => setGuideSendStarted(true)}
      /> : null}
      <BottomDrawer
        visible={reactionGuideVisible}
        onClose={closeReactionPicker}
        presentation="modal"
        contentLayout="edgeToEdge"
        keyboardBehavior="extend"
        scrimToken="pineSubtle"
        snapPoints={["46%", "62%", "85%"]}
        snapIndex={stagedReaction !== PLAN_HARD_PASS_REACTION.id
          ? 0
          : hardPassReasonOption === "Other" ? 2 : 1}
        dismissable
        dismissOnBackdropPress
        enableContentPanningGesture
        contentExtendsIntoBottomSafeArea
        animateOnHide
        bottomAccessory={stagedReaction === PLAN_HARD_PASS_REACTION.id ? (
          <Button
            fullWidth
            accessibilityLabel="Save hard pass reason"
            onPress={saveHardPass}
          >
            Done
          </Button>
        ) : undefined}
      >
        {reactionPickerItem ? (
          <View style={styles.planReactionDrawerContent}>
            <BottomDrawerHeader
              variant="withClose"
              titleVariant="sm"
              title={`React to ${reactionPickerItem.title}`}
              onClose={closeReactionPicker}
              closeAccessibilityLabel="Close reactions"
            />
            {stagedReaction === PLAN_HARD_PASS_REACTION.id ? (
              <Reanimated.View
                key="hard-pass"
                entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
                style={styles.planReactionState}
              >
                <BottomDrawerScrollView
                  testID="plan-hard-pass-composer"
                  automaticallyAdjustKeyboardInsets
                  keyboardDismissMode="interactive"
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.planHardPassComposerContent}
                >
                  <View style={styles.planHardPassField}>
                    <View style={styles.planHardPassReasonHeader}>
                      <Text variant="label" tone="secondary">Why? (optional)</Text>
                      <Pressable
                        testID="plan-reaction-choice-hard-pass"
                        accessibilityRole="button"
                        accessibilityLabel={`React with ${PLAN_HARD_PASS_REACTION.label}`}
                        accessibilityHint="Tap again to deselect Hard pass"
                        accessibilityState={{ selected: true }}
                        onPress={toggleHardPass}
                        style={({ pressed }) => [
                          styles.planHardPassSelectedPill,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text>{PLAN_HARD_PASS_REACTION.emoji} Hard pass</Text>
                        <Icon name="check" size={13} color={colors.textPrimary} strokeWidth={2.5} />
                      </Pressable>
                    </View>
                    <View accessibilityRole="radiogroup" style={styles.planHardPassReasonChoices}>
                      {[...HARD_PASS_REASON_OPTIONS, "Other" as const].map((reason) => {
                        const selected = hardPassReasonOption === reason;
                        return (
                          <Pressable
                            key={reason}
                            accessibilityRole="radio"
                            accessibilityLabel={reason}
                            accessibilityState={{ selected }}
                            onPress={() => {
                              setHardPassReasonOption(reason);
                              if (reason !== "Other") {
                                setHardPassReason("");
                                Keyboard.dismiss();
                              }
                            }}
                            style={({ pressed }) => [
                              styles.planHardPassReasonChoice,
                              selected && styles.planHardPassReasonChoiceSelected,
                              pressed && styles.pressed,
                            ]}
                          >
                            <Text style={styles.planHardPassReasonChoiceText}>{reason}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {hardPassReasonOption === "Other" ? (
                      <Input
                        accessibilityLabel="Why is this a hard pass?"
                        placeholder="Say why (optional)"
                        value={hardPassReason}
                        autoFocus
                        maxLength={140}
                        multiline
                        multilineMinHeight={112}
                        multilineMaxHeight={180}
                        textAlignVertical="top"
                        onChangeText={setHardPassReason}
                      />
                    ) : null}
                  </View>
                </BottomDrawerScrollView>
              </Reanimated.View>
            ) : (
              <Reanimated.View
                key="choices"
                entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
                style={styles.planReactionState}
              >
                <BottomDrawerScrollView
                  testID="plan-reaction-picker-scroll"
                  automaticallyAdjustKeyboardInsets
                  keyboardDismissMode="interactive"
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.planReactionPickerScrollContent}
                >
            <View style={styles.planReactionSection}>
              <Text variant="label" tone="secondary">Upvote</Text>
              <View style={styles.planReactionChoices}>
                {PLAN_POSITIVE_REACTION_OPTIONS.map((reaction) => (
                  <Pressable
                    key={reaction.id}
                    testID={`plan-reaction-choice-${reaction.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`React with ${reaction.label}`}
                    accessibilityState={{ selected: stagedReaction === reaction.id }}
                    onPress={() => selectOrdinaryReaction(reaction.id)}
                    style={({ pressed }) => [
                      styles.planReactionChoice,
                      stagedReaction === reaction.id && styles.planReactionChoiceSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.planReactionChoiceEmoji}>{reaction.emoji}</Text>
                    {stagedReaction === reaction.id ? (
                      <View style={styles.planReactionChoiceCheck}>
                        <Icon name="check" size={11} color={colors.canvas} strokeWidth={3} />
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.planReactionSection}>
              <Text variant="label" tone="secondary">Not for me</Text>
              <View style={styles.planReactionChoices}>
                {PLAN_NEGATIVE_REACTION_OPTIONS.map((reaction) => (
                  <Pressable
                    key={reaction.id}
                    testID={`plan-reaction-choice-${reaction.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`React with ${reaction.label}`}
                    accessibilityState={{ selected: stagedReaction === reaction.id }}
                    onPress={() => selectOrdinaryReaction(reaction.id)}
                    style={({ pressed }) => [
                      styles.planReactionChoice,
                      stagedReaction === reaction.id && styles.planReactionChoiceSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.planReactionChoiceEmoji}>{reaction.emoji}</Text>
                    {stagedReaction === reaction.id ? (
                      <View style={styles.planReactionChoiceCheck}>
                        <Icon name="check" size={11} color={colors.canvas} strokeWidth={3} />
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </View>
            <View testID="plan-hard-pass-section" style={styles.planHardPassSection}>
              <Text variant="label" tone="secondary">Hard pass</Text>
              <Pressable
                testID="plan-reaction-choice-hard-pass"
                accessibilityRole="button"
                accessibilityLabel={`React with ${PLAN_HARD_PASS_REACTION.label}`}
                accessibilityState={{ selected: false }}
                onPress={toggleHardPass}
                style={({ pressed }) => [
                  styles.planReactionChoice,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.planReactionChoiceEmoji}>{PLAN_HARD_PASS_REACTION.emoji}</Text>
              </Pressable>
            </View>
                </BottomDrawerScrollView>
              </Reanimated.View>
            )}
          </View>
        ) : null}
      </BottomDrawer>
      <AlertDialog
        visible={pendingHardPassSendIds !== null}
        title={pendingHardPassItems.length === 1
          ? `${pendingHardPassItems[0]?.title} has a hard pass`
          : `${pendingHardPassItems.length} recipes have a hard pass`}
        description={hardPassReviewDescription}
        cancelLabel="Go back"
        actionLabel="Include anyway"
        actionVariant="primary"
        onClose={() => setPendingHardPassSendIds(null)}
        onCancel={() => setPendingHardPassSendIds(null)}
        onAction={() => {
          if (pendingHardPassSendIds) finishSend(pendingHardPassSendIds, true);
        }}
      />
    </>
  );
}
