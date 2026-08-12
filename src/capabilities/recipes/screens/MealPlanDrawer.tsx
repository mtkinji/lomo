import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";

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
import { BottomDrawerHeader } from "../../../ui/layout/BottomDrawerHeader";
import { Heading, Text } from "../../../ui/Typography";
import {
  PLAN_POSITIVE_REACTION_OPTIONS,
  PLAN_REACTION_OPTIONS,
  type PlanReaction,
  type PlanReactionCounts,
} from "../../meal-planning/domain/sharedMealCart";
import { getPlanLifecycleSignature, reconcilePlanCandidateOrder, type PlanLifecycle } from "../../meal-planning/domain/planLifecycle";
import { RecipeArtwork } from "../components/RecipeArtwork";
import { styles } from "./RecipeLibraryScreen.styles";

const HOUSEHOLD_FOOD_EMPTY_ILLUSTRATION = require("../../../../assets/illustrations/groceries-empty.png");

type PlanPerson = { personId: string; displayName: string; avatarUrl: string | null };
type PlanSupporter = PlanPerson & { reaction: PlanReaction };

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
  missingItemCount: number | null;
  contributor?: PlanPerson;
  supporters?: PlanSupporter[];
  reactionCounts?: PlanReactionCounts;
  viewerReaction?: PlanReaction | null;
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
  onReact?(candidateId: string, reaction: PlanReaction | null): void;
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
        {people.map((person) => <Text key={person.personId} tone="secondary">{person.displayName}</Text>)}
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
  onReact?(candidateId: string, reaction: PlanReaction | null): void;
  onAdd(item: MealPlanTrayItem): void;
  reacting: boolean;
}) {
  return (
    <View style={styles.planReactionBar}>
      {PLAN_REACTION_OPTIONS.map((reaction) => (
        <PlanReactionPill key={reaction.id} item={item} reaction={reaction} onReact={onReact} reacting={reacting} />
      ))}
      {item.canReact && onReact ? (
        <View style={styles.planVoteActions}>
          {(!item.viewerReaction || item.viewerReaction === 'downvote') ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Upvote ${item.title}`}
              accessibilityHint="Choose how to upvote"
              disabled={reacting}
              onPress={() => onAdd(item)}
              hitSlop={8}
              style={({ pressed }) => [styles.planAddReaction, pressed && styles.pressed]}
            >
              <Icon testID={`plan-upvote-icon-${item.candidateId}`} name="arrowUp" size={16} color={colors.textSecondary} strokeWidth={2.5} />
            </Pressable>
          ) : null}
          {item.viewerReaction !== 'downvote' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Downvote ${item.title}`}
              accessibilityHint="Marks this recipe as not for you"
              disabled={reacting}
              onPress={() => {
                void HapticsService.trigger("canvas.toggle.on");
                onReact(item.candidateId, 'downvote');
              }}
              hitSlop={8}
              style={({ pressed }) => [styles.planAddReaction, pressed && styles.pressed]}
            >
              <Icon testID={`plan-downvote-icon-${item.candidateId}`} name="arrowDown" size={16} color={colors.textSecondary} strokeWidth={2.5} />
            </Pressable>
          ) : null}
        </View>
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
  onReact?(candidateId: string, reaction: PlanReaction | null): void;
  onSendToGroceries?(candidateIds: string[]): void;
  onMarkMade?(candidateId: string): void;
  onOpenGroceries?(): void;
  reactingCandidateIds?: ReadonlySet<string>;
}) {
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [displayIds, setDisplayIds] = useState<string[]>([]);
  const [reactionPickerItem, setReactionPickerItem] = useState<MealPlanTrayItem | null>(null);
  const wasVisibleRef = useRef(false);
  const lifecycleSignatureRef = useRef("");

  useEffect(() => {
    if (!visible) {
      wasVisibleRef.current = false;
      lifecycleSignatureRef.current = "";
      setSelecting(false);
      setSelectedIds(new Set());
      setReactionPickerItem(null);
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
  const planAction = selecting ? (
    <View style={styles.planSelectionActions}>
      <Button variant="ghost" onPress={() => { setSelecting(false); setSelectedIds(new Set()); }}>Cancel</Button>
      <Button
        variant="primary"
        style={styles.planSelectionConfirm}
        disabled={selectedIds.size === 0}
        accessibilityLabel={`Send ${selectedIds.size} ${selectedIds.size === 1 ? "recipe" : "recipes"} to Groceries`}
        onPress={() => { onSendToGroceries?.([...selectedIds]); setSelecting(false); setSelectedIds(new Set()); }}
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
      snapPoints={["88%"]}
      snapIndex={0}
      dismissable={false}
      presentation="inline"
      enableContentPanningGesture
      contentExtendsIntoBottomSafeArea
      bottomAccessory={planAction}
      bottomAccessoryStyle={styles.planDrawerBottomAction}
      sheetStyle={styles.planDrawerSheet}
      handleContainerStyle={styles.planDrawerHandleRegion}
    >
      <View style={styles.planDrawerViewport}>
        <BottomDrawerHeader
          variant="withClose"
          titleVariant="sm"
          onClose={onClose}
          closeAccessibilityLabel="Close Plan"
          containerStyle={styles.planDrawerHeader}
          title={(
            <View accessible accessibilityRole="header" accessibilityLabel={`Plan, ${items.length} ${items.length === 1 ? "recipe" : "recipes"}`} style={styles.planDrawerHeaderMain}>
              <Icon name="meal" size={16} color={colors.textPrimary} />
              <Heading variant="sm">Plan</Heading>
              {items.length ? <Text tone="secondary">· {items.length}</Text> : null}
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
                  return (
                    <View key={item.id} style={styles.planDrawerItem}>
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
                              onAdd={setReactionPickerItem}
                              reacting={Boolean(reactingCandidateIds?.has(item.candidateId))}
                            />
                            {item.lifecycle === "sent" && item.missingItemCount !== null && item.missingItemCount > 0 ? <Text tone="secondary" style={styles.planMissingItems}>Missing {item.missingItemCount} {item.missingItemCount === 1 ? "item" : "items"}</Text> : null}
                            {item.canMarkMade && onMarkMade ? <Button size="xs" variant="ghost" onPress={() => onMarkMade(item.candidateId)}>Made</Button> : null}
                          </View>
                        </View>
                        {canManage && item.canRemove ? (
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
                    </View>
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
        </BottomDrawerScrollView>
      </View>
      </BottomDrawer>
      <BottomDrawer
        visible={reactionPickerItem !== null}
        onClose={() => setReactionPickerItem(null)}
        snapPoints={[240]}
        presentation="modal"
        dynamicSizing
      >
        {reactionPickerItem ? (
          <View style={styles.planReactionPicker}>
            <BottomDrawerHeader
              variant="withClose"
              titleVariant="sm"
              title={`Upvote ${reactionPickerItem.title}`}
              onClose={() => setReactionPickerItem(null)}
              closeAccessibilityLabel="Close reactions"
            />
            <View style={styles.planReactionChoices}>
              {PLAN_POSITIVE_REACTION_OPTIONS.map((reaction) => (
                <Pressable
                  key={reaction.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Upvote with ${reaction.label}`}
                  onPress={() => {
                    void HapticsService.trigger("canvas.toggle.on");
                    onReact?.(reactionPickerItem.candidateId, reaction.id);
                    setReactionPickerItem(null);
                  }}
                  style={({ pressed }) => [styles.planReactionChoice, pressed && styles.pressed]}
                >
                  <Text style={styles.planReactionChoiceEmoji}>{reaction.emoji}</Text>
                  <Text variant="label">{reaction.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </BottomDrawer>
    </>
  );
}
