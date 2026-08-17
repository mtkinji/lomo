import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Pressable, View } from "react-native";
import Reanimated, {
  Easing,
  FadeIn,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors } from "../../../theme";
import { HapticsService } from "../../../services/HapticsService";
import { BottomDrawer, BottomDrawerScrollView } from "../../../ui/BottomDrawer";
import { Button, IconButton } from "../../../ui/Button";
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
import { getPlanLifecycleSignature, reconcilePlanCandidateOrder, type PlanLifecycle } from "../../meal-planning/domain/planLifecycle";
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
const PLAN_ROW_REORDER_TRANSITION = LinearTransition.duration(260)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);

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
  onMarkMade,
  onOpenGroceries,
  reactingCandidateIds,
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
  onSendToGroceries?(candidateIds: string[], options?: { acknowledgeHardPasses?: boolean }): void;
  onMarkMade?(candidateId: string): void;
  onOpenGroceries?(): void;
  reactingCandidateIds?: ReadonlySet<string>;
}) {
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [displayIds, setDisplayIds] = useState<string[]>([]);
  const [reactionPickerItem, setReactionPickerItem] = useState<MealPlanTrayItem | null>(null);
  const [reactionGuideVisible, setReactionGuideVisible] = useState(false);
  const [stagedReaction, setStagedReaction] = useState<PlanReaction | null>(null);
  const [hardPassReasonOption, setHardPassReasonOption] = useState<HardPassReasonOption | null>(null);
  const [hardPassReason, setHardPassReason] = useState("");
  const [pendingHardPassSendIds, setPendingHardPassSendIds] = useState<string[] | null>(null);
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const wasVisibleRef = useRef(false);
  const lifecycleSignatureRef = useRef("");
  const reactionSelectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      setSelecting(false);
      setSelectedIds(new Set());
      setReactionPickerItem(null);
      setReactionGuideVisible(false);
      setStagedReaction(null);
      setHardPassReasonOption(null);
      setHardPassReason("");
      setPendingHardPassSendIds(null);
      return;
    }
    const lifecycleSignature = getPlanLifecycleSignature(items);
    const reason = !wasVisibleRef.current ? "open" : lifecycleSignatureRef.current !== lifecycleSignature ? "lifecycle" : "reaction";
    setDisplayIds((current) => reconcilePlanCandidateOrder(current, items, reason));
    lifecycleSignatureRef.current = lifecycleSignature;
    wasVisibleRef.current = true;
  }, [items, visible]);

  const displayItems = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    return displayIds.flatMap((id) => byId.get(id) ?? []);
  }, [displayIds, items]);
  const groups = (["ready", "sent", "idea"] as const).flatMap((lifecycle) => {
    const groupItems = displayItems.filter((item) => item.lifecycle === lifecycle);
    return groupItems.length ? [{ lifecycle, items: groupItems }] : [];
  });
  const ideas = items.filter((item) => item.lifecycle === "idea");
  const groupLabel: Record<PlanLifecycle, string> = { ready: "Ready to cook", sent: "Sent to groceries", idea: "Ideas" };
  const toggleSelection = (candidateId: string) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(candidateId)) next.delete(candidateId); else next.add(candidateId);
    return next;
  });
  const finishSelection = (candidateIds: string[], acknowledgeHardPasses = false) => {
    if (acknowledgeHardPasses) {
      onSendToGroceries?.(candidateIds, { acknowledgeHardPasses: true });
    } else {
      onSendToGroceries?.(candidateIds);
    }
    setSelecting(false);
    setSelectedIds(new Set());
    setPendingHardPassSendIds(null);
  };
  const requestSelectionSend = () => {
    const candidateIds = [...selectedIds];
    const needsReview = candidateIds.some((candidateId) =>
      items.some((item) => item.candidateId === candidateId && item.requiresHardPassReview),
    );
    if (needsReview) {
      setPendingHardPassSendIds(candidateIds);
      return;
    }
    finishSelection(candidateIds);
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
  const planAction = selecting ? (
    <View style={styles.planSelectionActions}>
      <Button variant="ghost" onPress={() => { setSelecting(false); setSelectedIds(new Set()); }}>Cancel</Button>
      <Button
        variant="primary"
        style={styles.planSelectionConfirm}
        disabled={selectedIds.size === 0}
        accessibilityLabel={`Send ${selectedIds.size} ${selectedIds.size === 1 ? "recipe" : "recipes"} to Groceries`}
        onPress={requestSelectionSend}
      >
        {`Send${selectedIds.size ? ` ${selectedIds.size}` : ""} to Groceries`}
      </Button>
    </View>
  ) : canManage && ideas.length && onSendToGroceries ? (
    <Button variant="primary" fullWidth onPress={() => setSelecting(true)}>Send to Groceries</Button>
  ) : null;

  return (
    <>
      <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={["100%"]}
      snapIndex={0}
      presentation="inline"
      keyboardAvoidanceEnabled={false}
      enableContentPanningGesture
      contentExtendsIntoBottomSafeArea
      bottomAccessory={planAction ? (
        <Reanimated.View
          testID="plan-grocery-action-transition"
          accessibilityElementsHidden={shareSheetVisible}
          importantForAccessibility={shareSheetVisible ? "no-hide-descendants" : "auto"}
          pointerEvents={shareSheetVisible ? "none" : "auto"}
          style={planActionAnimatedStyle}
        >
          {planAction}
        </Reanimated.View>
      ) : null}
      bottomAccessoryShowTopBorder
      sheetStyle={styles.planDrawerSheet}
      handleContainerStyle={styles.planDrawerHandleRegion}
    >
      <View style={styles.planDrawerViewport}>
        <BottomDrawerHeader
          variant="default"
          containerStyle={styles.planDrawerHeader}
          rightAction={onSharePlan ? (
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
          ) : undefined}
          title={(
            <View testID="plan-drawer-title-cluster" style={styles.planDrawerHeaderMain}>
              <View
                accessible
                accessibilityRole="header"
                accessibilityLabel={`Plan, ${items.length} ${items.length === 1 ? "recipe" : "recipes"}`}
                style={styles.planDrawerTitleIdentity}
              >
                <Icon testID="plan-drawer-header-icon" name="meal" size={24} color={colors.textPrimary} />
                <Heading variant="lg">Plan</Heading>
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
        <BottomDrawerScrollView contentContainerStyle={styles.planDrawerContent}>
          {items.length ? groups.map((group) => (
            <View key={group.lifecycle} style={styles.planLifecycleGroup}>
              {group.lifecycle !== "idea" ? (
                <View style={styles.planLifecycleHeading}>
                  <Text variant="label" tone="secondary">{groupLabel[group.lifecycle]}</Text>
                  {group.lifecycle === "sent" && onOpenGroceries ? <Button size="xs" variant="ghost" onPress={onOpenGroceries}>View groceries</Button> : null}
                </View>
              ) : null}
              <View style={styles.planDrawerList}>
                {group.items.map((item) => {
                  const selectable = selecting && item.lifecycle === "idea";
                  const hasAdditionalRowAction = Boolean(item.canMarkMade && onMarkMade);
                  return (
                    <Reanimated.View
                      key={item.id}
                      layout={PLAN_ROW_REORDER_TRANSITION}
                      style={styles.planDrawerItem}
                    >
                      <View testID={`plan-row-${item.candidateId}`} style={styles.planDrawerMainRow}>
                        {selectable ? (
                          <Pressable
                            accessibilityRole="checkbox"
                            accessibilityLabel={`Send ${item.title} to Groceries`}
                            accessibilityState={{ checked: selectedIds.has(item.candidateId) }}
                            onPress={() => toggleSelection(item.candidateId)}
                            style={[styles.planDrawerSelection, selectedIds.has(item.candidateId) && styles.planDrawerSelectionActive]}
                          >
                            {selectedIds.has(item.candidateId) ? <Icon name="check" size={14} color={colors.canvas} /> : null}
                          </Pressable>
                        ) : null}
                        <View style={styles.planDrawerArtworkFrame}>
                          <RecipeArtwork storageRef={item.storageRef} accessibilityLabel={item.title} style={styles.planDrawerArtwork} />
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
                            {item.lifecycle === "sent" && item.missingItemCount !== null && item.missingItemCount > 0 ? <Text tone="secondary" style={styles.planMissingItems}>Missing {item.missingItemCount} {item.missingItemCount === 1 ? "item" : "items"}</Text> : null}
                            {item.canMarkMade && onMarkMade ? <Button size="xs" variant="ghost" onPress={() => onMarkMade(item.candidateId)}>Made</Button> : null}
                          </View>
                        </View>
                        {canManage && item.canRemove && !hasAdditionalRowAction ? (
                          <IconButton
                            accessibilityLabel={`Remove ${item.title} from Plan`}
                            variant="ghost"
                            style={styles.planDrawerMore}
                            onPress={() => onRemove(item)}
                          >
                            <Icon name="trash" size={18} color={colors.textSecondary} />
                          </IconButton>
                        ) : canManage && item.canRemove ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <IconButton accessibilityLabel={`More actions for ${item.title}`} variant="ghost" style={styles.planDrawerMore}><Icon name="more" size={18} color={colors.textSecondary} /></IconButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="bottom" align="end">
                              {item.canMarkMade && onMarkMade ? <DropdownMenuItem label="Made" icon="checkCircle" onPress={() => onMarkMade(item.candidateId)} /> : null}
                              {item.canMarkMade && onMarkMade ? <DropdownMenuSeparator /> : null}
                              <DropdownMenuItem label="Remove from Plan" icon="trash" variant="destructive" onPress={() => onRemove(item)} />
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </View>
                    </Reanimated.View>
                  );
                })}
              </View>
            </View>
          )) : (
            <EmptyState
              variant="screen"
              illustration={HOUSEHOLD_FOOD_EMPTY_ILLUSTRATION}
              title="Add recipes to your Plan"
              style={styles.planDrawerEmpty}
            />
          )}
          {guestSuggestions?.length ? (
            <View style={styles.planGuestSuggestions}>
              <Text variant="label" tone="secondary">Guest suggestions</Text>
              {guestSuggestions.map((response) => (
                <Text key={response.id} tone="secondary">
                  {response.displayName || "Guest"} · “{response.suggestion}”
                </Text>
              ))}
            </View>
          ) : null}
        </BottomDrawerScrollView>
      </View>
      </BottomDrawer>
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
          if (pendingHardPassSendIds) finishSelection(pendingHardPassSendIds, true);
        }}
      />
    </>
  );
}
