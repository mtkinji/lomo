import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableProps,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { CAPABILITY_MENU_REGISTRY } from '../capabilities/registry';
import type { CapabilityMenuDestinationId } from '../capabilities/types';
import { colors, fonts, radii, spacing, typography } from '../theme';
import { BrandLockup } from '../ui/BrandLockup';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { ButtonLabel } from '../ui/Typography';
import { KwiltLoader } from '../ui/KwiltLoader';
import { Badge } from '../ui/Badge';
import { NavigationDiscoveryDot } from '../ui/NavigationDiscoveryDot';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import {
  EMPTY_CAPABILITY_PIN_OVERRIDES,
  getCapabilityMenuTiers,
  isCapabilityPinned,
  type CapabilityPinOverrides,
} from './capabilityMenuPins';

type CapabilityMenuProps = {
  activeCapabilityId: CapabilityMenuDestinationId | null;
  activeChatThreadId?: string | null;
  chats: readonly CapabilityMenuChat[];
  chatsLoading?: boolean;
  chatsError?: string | null;
  displayName?: string;
  avatarUrl?: string | null;
  onSelectCapability: (id: CapabilityMenuDestinationId) => void;
  onReselectCapability?: (id: CapabilityMenuDestinationId) => void;
  onSetCapabilityPinned: (id: CapabilityMenuDestinationId, pinned: boolean) => void;
  onOpenCapabilityPinMenu?: (id: CapabilityMenuDestinationId, pinned: boolean) => void;
  onSelectChat: (threadId: string) => void;
  onArchiveChat: (threadId: string) => void;
  onDeleteChat: (threadId: string) => void;
  onDeleteChats: (threadIds: readonly string[]) => Promise<boolean>;
  onCreateChat: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenHome?: () => void;
  onOpenChat: () => void;
  sharedHomeEnabled?: boolean;
  exploreEnabled?: boolean;
  choresAttentionCount?: number;
  mealPlanNeedsAttention?: boolean;
  unvisitedCapabilityIds?: readonly CapabilityMenuDestinationId[];
  hiddenCapabilityIds?: readonly CapabilityMenuDestinationId[];
  pinOverrides?: CapabilityPinOverrides;
};

export type CapabilityMenuChat = {
  id: string;
  title: string;
  updatedAt: string;
};

type CapabilityPinMenuTrigger = {
  open: () => void;
};

export function CapabilityMenu({
  activeCapabilityId,
  activeChatThreadId,
  chats,
  chatsLoading = false,
  chatsError = null,
  displayName,
  avatarUrl,
  onSelectCapability,
  onReselectCapability,
  onSetCapabilityPinned,
  onOpenCapabilityPinMenu,
  onSelectChat,
  onArchiveChat,
  onDeleteChat,
  onDeleteChats,
  onCreateChat,
  onOpenSearch,
  onOpenSettings,
  onOpenHome,
  onOpenChat,
  sharedHomeEnabled = false,
  exploreEnabled = false,
  choresAttentionCount = 0,
  mealPlanNeedsAttention = false,
  unvisitedCapabilityIds = [],
  hiddenCapabilityIds = [],
  pinOverrides = EMPTY_CAPABILITY_PIN_OVERRIDES,
}: CapabilityMenuProps) {
  const { primaryClusters, moreCapabilityIds } = useMemo(
    () => getCapabilityMenuTiers(pinOverrides),
    [pinOverrides],
  );
  const [moreExpanded, setMoreExpanded] = useState(
    () => activeCapabilityId !== null && moreCapabilityIds.includes(activeCapabilityId),
  );
  const [chatSelectionMode, setChatSelectionMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(() => new Set());
  const [chatBulkActionPending, setChatBulkActionPending] = useState(false);
  const pinMenuTriggers = useRef<Partial<Record<CapabilityMenuDestinationId, CapabilityPinMenuTrigger | null>>>({});

  useEffect(() => {
    if (activeCapabilityId && moreCapabilityIds.includes(activeCapabilityId)) {
      setMoreExpanded(true);
    }
  }, [activeCapabilityId, moreCapabilityIds]);

  useEffect(() => {
    const visibleIds = new Set(chats.map((chat) => chat.id));
    setSelectedChatIds((current) => {
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [chats]);

  const enterChatSelection = (threadId?: string) => {
    setSelectedChatIds(threadId ? new Set([threadId]) : new Set());
    setChatSelectionMode(true);
  };

  const exitChatSelection = () => {
    if (chatBulkActionPending) return;
    setChatSelectionMode(false);
    setSelectedChatIds(new Set());
  };

  const toggleChatSelection = (threadId: string) => {
    setSelectedChatIds((current) => {
      const next = new Set(current);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  };

  const runChatBulkAction = async (
    action: (threadIds: readonly string[]) => Promise<boolean>,
  ) => {
    const selectedIds = chats
      .filter((chat) => selectedChatIds.has(chat.id))
      .map((chat) => chat.id);
    if (selectedIds.length === 0 || chatBulkActionPending) return;
    setChatBulkActionPending(true);
    try {
      if (await action(selectedIds)) {
        setChatSelectionMode(false);
        setSelectedChatIds(new Set());
      }
    } finally {
      setChatBulkActionPending(false);
    }
  };

  const isCapabilityVisible = (id: CapabilityMenuDestinationId) => {
    const capability = CAPABILITY_MENU_REGISTRY.find((candidate) => candidate.id === id);
    if (!capability || capability.availability !== 'active') return false;
    if (hiddenCapabilityIds.includes(capability.id)) return false;
    if (capability.id === 'explore' && !exploreEnabled) return false;
    return true;
  };

  const renderCapability = (id: CapabilityMenuDestinationId) => {
    const capability = CAPABILITY_MENU_REGISTRY.find((candidate) => candidate.id === id);
    if (!capability || !isCapabilityVisible(id)) return null;
    const selected = activeCapabilityId === capability.id;
    const label = capability.label;
    const attentionCount = capability.id === 'chores' ? choresAttentionCount : 0;
    const showsMealPlanAttention = capability.id === 'recipes' && mealPlanNeedsAttention;
    const unvisited = unvisitedCapabilityIds.includes(capability.id);
    const pinned = isCapabilityPinned(capability.id, pinOverrides);
    const pinActionName = pinned ? 'unpin' : 'pin';
    const pinActionLabel = pinned ? 'Unpin' : 'Pin';
    const accessibilityLabel = [
      label,
      unvisited ? 'not yet visited' : null,
      attentionCount > 0 ? `${attentionCount} ready for review` : null,
      showsMealPlanAttention ? 'new meal ideas' : null,
    ].filter(Boolean).join(', ');

    return (
      <DropdownMenu key={capability.id}>
        <DropdownMenuTrigger
          ref={(trigger) => {
            pinMenuTriggers.current[capability.id] = trigger;
          }}
          accessible={false}
          pointerEvents="none"
          style={StyleSheet.absoluteFillObject}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ selected }}
          accessibilityActions={[
            { name: pinActionName, label: `${pinActionLabel} ${label}` },
          ]}
          testID={`capability.menu.${capability.id}`}
          onPress={() => {
            if (selected && onReselectCapability) {
              onReselectCapability(capability.id);
              return;
            }
            onSelectCapability(capability.id);
          }}
          onLongPress={() => {
            onOpenCapabilityPinMenu?.(capability.id, pinned);
            pinMenuTriggers.current[capability.id]?.open();
          }}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === pinActionName) {
              onSetCapabilityPinned(capability.id, !pinned);
            }
          }}
          style={({ pressed }) => [
            styles.capabilityRow,
            selected && styles.capabilityRowSelected,
            pressed && styles.rowPressed,
          ]}
        >
          <Icon
            name={capability.icon}
            size={18}
            color={selected ? colors.gray700 : colors.textSecondary}
          />
          <Text style={[styles.capabilityLabel, selected && styles.capabilityLabelSelected]}>
            {label}
          </Text>
          {unvisited ? (
            <NavigationDiscoveryDot testID={`capability.menu.${capability.id}.discovery`} />
          ) : null}
          {attentionCount > 0 ? (
            <Badge
              variant="secondary"
              testID="capability.menu.chores.attention"
              style={styles.attentionBadge}
              textStyle={styles.attentionBadgeText}
            >
              {attentionCount}
            </Badge>
          ) : null}
          {showsMealPlanAttention ? (
            <View
              testID="capability.menu.recipes.attention"
              style={styles.mealPlanAttention}
            />
          ) : null}
        </Pressable>
        <DropdownMenuContent
          testID={`capability.menu.${capability.id}.pin-menu`}
          side="bottom"
          sideOffset={4}
          align="start"
        >
          <DropdownMenuItem
            accessibilityLabel={`${pinActionLabel} ${label}`}
            icon={pinned ? 'pushPinOff' : 'pushPin'}
            label={pinActionLabel}
            onPress={() => onSetCapabilityPinned(capability.id, !pinned)}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const visibleMoreCapabilityIds = moreCapabilityIds.filter(isCapabilityVisible);
  const moreCapabilityCount = visibleMoreCapabilityIds.length;
  const moreDestinationNoun = moreCapabilityCount === 1 ? 'destination' : 'destinations';
  const moreContainsUnvisited = visibleMoreCapabilityIds.some(
    (id) => unvisitedCapabilityIds.includes(id),
  );
  const showMoreDiscovery = !moreExpanded && moreContainsUnvisited;

  return (
    <View style={styles.root}>
      <View testID="capability.menu.header" style={styles.header}>
        <BrandLockup logoSize={28} wordmarkSize="sm" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile and settings"
          onPress={onOpenSettings}
          hitSlop={6}
          style={({ pressed }) => [
            styles.settingsButton,
            pressed && styles.settingsButtonPressed,
          ]}
        >
          <ProfileAvatar name={displayName} avatarUrl={avatarUrl} size={36} />
          <Icon
            testID="capability.menu.settings.icon"
            name="settings"
            size={18}
            color={colors.gray700}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View testID="capability.menu.primary">
          {primaryClusters.map((capabilityIds, index) => (
            <View
              key={capabilityIds.join('.')}
              style={index < primaryClusters.length - 1
                ? styles.primaryCluster
                : undefined}
            >
              {capabilityIds.map(renderCapability)}
            </View>
          ))}
        </View>

        <View style={styles.moreSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${moreExpanded ? 'Collapse' : 'Expand'} More, ${moreCapabilityCount} ${moreDestinationNoun}${showMoreDiscovery ? ', contains unvisited destinations' : ''}`}
            accessibilityState={{ expanded: moreExpanded }}
            onPress={() => setMoreExpanded((expanded) => !expanded)}
            style={({ pressed }) => [styles.sectionHeader, pressed && styles.rowPressed]}
          >
            <Text style={styles.groupLabel}>MORE ({moreCapabilityCount})</Text>
            <View testID="capability.menu.more.action" style={styles.sectionHeaderAction}>
              {showMoreDiscovery ? (
                <NavigationDiscoveryDot testID="capability.menu.more.discovery" />
              ) : null}
              <Icon
                name={moreExpanded ? 'chevronUp' : 'chevronDown'}
                size={15}
                color={colors.muted}
              />
            </View>
          </Pressable>
          {moreExpanded ? (
            <View testID="capability.menu.more.items" style={styles.moreItems}>
              {visibleMoreCapabilityIds.map(renderCapability)}
            </View>
          ) : null}
        </View>

        <View style={[styles.sectionHeader, styles.chatsHeader]}>
          {chatSelectionMode ? (
            <>
              <Text style={styles.groupLabel}>
                {selectedChatIds.size === 0 ? 'Select chats' : `${selectedChatIds.size} selected`}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done selecting chats"
                disabled={chatBulkActionPending}
                onPress={exitChatSelection}
                hitSlop={6}
                style={({ pressed }) => [styles.chatSelectionDone, pressed && styles.rowPressed]}
              >
                <Text style={styles.chatSelectionDoneLabel}>Done</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View testID="capability.menu.chats.header.left" style={styles.chatsHeaderLabelActions}>
                <Text style={styles.groupLabel}>CHATS</Text>
                <DropdownMenu>
                  <DropdownMenuTrigger accessibilityLabel="More chat options">
                    <View pointerEvents="none" style={styles.chatMoreButton}>
                      <Icon name="more" size={17} color={colors.muted} />
                    </View>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="bottom" sideOffset={4} align="start">
                    <DropdownMenuItem
                      accessibilityLabel="Select chats"
                      label="Select chats"
                      icon="checkCircle"
                      onPress={() => enterChatSelection()}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="New chat"
                onPress={onCreateChat}
                hitSlop={6}
                style={({ pressed }) => [styles.sectionHeaderAction, pressed && styles.rowPressed]}
              >
                <Icon name="plus" size={17} color={colors.textPrimary} />
              </Pressable>
            </>
          )}
        </View>
        {chatsLoading && chats.length === 0 ? (
          <View style={styles.chatStateRow}>
            <KwiltLoader size="small" color={colors.textSecondary} />
            <Text style={styles.chatStateText}>Loading chats…</Text>
          </View>
        ) : chatsError && chats.length === 0 ? (
          <Text style={styles.chatStateText}>{chatsError}</Text>
        ) : chats.length === 0 ? (
          <Text style={styles.chatStateText}>No chats yet.</Text>
        ) : chats.map((chat) => (
          <CapabilityMenuChatRow
            key={chat.id}
            chat={chat}
            selected={chat.id === activeChatThreadId}
            selectionMode={chatSelectionMode}
            selectionChecked={selectedChatIds.has(chat.id)}
            onOpen={() => onSelectChat(chat.id)}
            onEnterSelection={() => enterChatSelection(chat.id)}
            onToggleSelection={() => toggleChatSelection(chat.id)}
            onArchive={() => onArchiveChat(chat.id)}
            onDelete={() => onDeleteChat(chat.id)}
          />
        ))}
      </ScrollView>

      <View
        testID="capability.menu.footer"
        style={[styles.footer, chatSelectionMode && styles.footerSelecting]}
      >
        {chatSelectionMode ? (
          <Button
            accessibilityLabel="Delete selected chats"
            disabled={selectedChatIds.size === 0 || chatBulkActionPending}
            loading={chatBulkActionPending}
            onPress={() => void runChatBulkAction(onDeleteChats)}
            size="md"
            style={styles.chatButton}
            variant="destructive"
          >
            <Icon name="trash" size={17} color={colors.primaryForeground} />
            <ButtonLabel tone="inverse">Delete</ButtonLabel>
          </Button>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search Kwilt"
              onPress={onOpenSearch}
              style={({ pressed }) => [
                styles.searchButton,
                pressed && styles.searchButtonPressed,
              ]}
            >
              <Icon name="search" size={20} color={colors.gray700} />
            </Pressable>

            {sharedHomeEnabled ? (
              <View style={styles.footerActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open Home"
                  onPress={onOpenHome}
                  style={({ pressed }) => [styles.homeButton, pressed && styles.searchButtonPressed]}
                >
                  <Icon name="home" size={17} color={colors.gray700} />
                  <Text style={styles.homeButtonLabel}>Home</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ask Kwilt"
                  onPress={onOpenChat}
                  style={({ pressed }) => [styles.askButton, styles.askButtonSplit, pressed && styles.chatButtonPressed]}
                >
                  <Icon name="navAiGuide" size={17} color={colors.gray50} />
                  <Text style={styles.chatButtonLabel}>Ask</Text>
                </Pressable>
              </View>
            ) : (
              <Button
                accessibilityLabel="Open chat"
                onPress={onOpenChat}
                variant="primary"
                size="md"
                style={styles.chatButton}
              >
                <Icon name="navAiGuide" size={17} color={colors.gray50} />
                <ButtonLabel tone="inverse">Chat</ButtonLabel>
              </Button>
            )}
          </>
        )}
      </View>
    </View>
  );
}

function CapabilityMenuChatRow({
  chat,
  selected,
  selectionMode,
  selectionChecked,
  onOpen,
  onEnterSelection,
  onToggleSelection,
  onArchive,
  onDelete,
}: {
  chat: CapabilityMenuChat;
  selected: boolean;
  selectionMode: boolean;
  selectionChecked: boolean;
  onOpen: () => void;
  onEnterSelection: () => void;
  onToggleSelection: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const shiftedRowStyle = useAnimatedStyle(() => ({
    transform: [{
      translateX: withTiming(selectionMode ? 30 : 0, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    }],
  }), [selectionMode]);
  const selectionControlStyle = useAnimatedStyle(() => ({
    opacity: withTiming(selectionMode ? 1 : 0, {
      duration: 140,
      reduceMotion: ReduceMotion.System,
    }),
    transform: [{
      scale: withTiming(selectionMode ? 1 : 0.82, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    }],
  }), [selectionMode]);
  const renderArchiveAction: NonNullable<SwipeableProps['renderLeftActions']> = (
    _progress,
    _translation,
    swipeable,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Archive ${chat.title}`}
      onPress={() => {
        swipeable.close();
        onArchive();
      }}
      style={({ pressed }) => [
        styles.swipeAction,
        styles.swipeArchiveAction,
        pressed && styles.swipeActionPressed,
      ]}
    >
      <Icon name="archive" size={17} color={colors.primaryForeground} />
      <Text style={styles.swipeActionLabel}>Archive</Text>
    </Pressable>
  );

  const renderDeleteAction: NonNullable<SwipeableProps['renderRightActions']> = (
    _progress,
    _translation,
    swipeable,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Delete ${chat.title}`}
      onPress={() => {
        swipeable.close();
        onDelete();
      }}
      style={({ pressed }) => [
        styles.swipeAction,
        styles.swipeDeleteAction,
        pressed && styles.swipeActionPressed,
      ]}
    >
      <Icon name="trash" size={17} color={colors.primaryForeground} />
      <Text style={styles.swipeActionLabel}>Delete</Text>
    </Pressable>
  );

  return (
    <ReanimatedSwipeable
      enabled={!selectionMode}
      friction={1.5}
      leftThreshold={36}
      rightThreshold={36}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={renderArchiveAction}
      renderRightActions={renderDeleteAction}
      containerStyle={styles.chatSwipeContainer}
    >
      <Pressable
        testID={`capability.menu.chat.selection-target.${chat.id}`}
        accessibilityRole={selectionMode ? 'checkbox' : 'button'}
        accessibilityLabel={selectionMode
          ? `${selectionChecked ? 'Deselect' : 'Select'} ${chat.title}`
          : `Open chat ${chat.title}`}
        accessibilityState={selectionMode ? { checked: selectionChecked } : { selected }}
        accessibilityActions={selectionMode ? undefined : [
          { name: 'archive', label: `Archive ${chat.title}` },
          { name: 'delete', label: `Delete ${chat.title}` },
        ]}
        onAccessibilityAction={selectionMode ? undefined : (event) => {
          if (event.nativeEvent.actionName === 'archive') onArchive();
          if (event.nativeEvent.actionName === 'delete') onDelete();
        }}
        onLongPress={selectionMode ? undefined : onEnterSelection}
        onPress={selectionMode ? onToggleSelection : onOpen}
        style={({ pressed }) => [
          styles.chatSelectionFrame,
          pressed && styles.rowPressed,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.chatSelectionControl, selectionControlStyle]}
        >
          {selectionChecked ? (
            <View
              testID={`capability.menu.chat.selection-indicator.${chat.id}.selected`}
              style={styles.chatSelectionCheckedCircle}
            >
              <Icon name="check" size={13} strokeWidth={3} color={colors.primaryForeground} />
            </View>
          ) : (
            <View style={styles.chatSelectionEmptyCircle} />
          )}
        </Animated.View>
        <Animated.View
          testID={`capability.menu.chat.shift.${chat.id}`}
          style={[styles.chatRowMotion, shiftedRowStyle]}
        >
          <View style={[
            styles.chatRow,
            selected && !selectionMode && styles.capabilityRowSelected,
          ]}>
            <Icon name="navAiGuide" size={17} color={colors.textSecondary} />
            <View style={styles.chatRowText}>
              <Text numberOfLines={1} style={styles.chatTitle}>{chat.title}</Text>
              <Text style={styles.chatDate}>{formatChatDate(chat.updatedAt)}</Text>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.lg,
  },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scroll: {
    flex: 1,
    marginTop: spacing.lg,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  primaryCluster: {
    marginBottom: spacing.sm,
  },
  moreSection: {
    marginTop: spacing.xs,
  },
  sectionHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  groupLabel: {
    ...typography.label,
    fontFamily: fonts.regular,
    color: colors.muted,
  },
  sectionHeaderAction: {
    width: 36,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 10,
  },
  moreItems: {
    paddingLeft: spacing.md,
  },
  capabilityRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
  },
  capabilityRowSelected: {
    backgroundColor: colors.gray100,
  },
  capabilityLabel: {
    flex: 1,
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  attentionBadge: {
    minWidth: 24,
    alignSelf: 'center',
    backgroundColor: colors.actionAttention,
  },
  attentionBadgeText: {
    color: colors.actionAttentionForeground,
  },
  mealPlanAttention: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.actionAttention,
  },
  capabilityLabelSelected: {
    fontFamily: fonts.bold,
    color: colors.gray800,
  },
  rowPressed: {
    opacity: 0.62,
  },
  chatsHeader: {
    paddingTop: spacing.md,
  },
  chatsHeaderLabelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chatMoreButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  chatSelectionDone: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
  },
  chatSelectionDoneLabel: {
    ...typography.bodySm,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  chatStateRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  chatStateText: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  chatRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.canvas,
  },
  chatSwipeContainer: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  chatSelectionFrame: {
    width: '100%',
    position: 'relative',
  },
  chatSelectionControl: {
    position: 'absolute',
    left: spacing.sm,
    top: 15,
    zIndex: 1,
  },
  chatSelectionEmptyCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.sumi600,
  },
  chatSelectionCheckedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sumi900,
  },
  chatRowMotion: {
    width: '100%',
  },
  swipeAction: {
    width: 88,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  swipeArchiveAction: {
    backgroundColor: colors.gray700,
  },
  swipeDeleteAction: {
    backgroundColor: colors.destructive,
  },
  swipeActionPressed: {
    opacity: 0.82,
  },
  swipeActionLabel: {
    ...typography.caption,
    fontFamily: fonts.medium,
    color: colors.primaryForeground,
  },
  chatRowText: {
    minWidth: 0,
    flex: 1,
    paddingVertical: spacing.xs,
  },
  chatTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  chatDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  footer: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  footerSelecting: {
    justifyContent: 'flex-end',
  },
  settingsButton: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.xs,
    paddingRight: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.gray100,
  },
  settingsButtonPressed: {
    backgroundColor: colors.gray200,
  },
  searchButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.gray100,
  },
  searchButtonPressed: {
    backgroundColor: colors.gray200,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  askButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    backgroundColor: colors.sumi900,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
  },
  homeButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
  },
  homeButtonLabel: {
    ...typography.bodySm,
    fontFamily: fonts.medium,
    color: colors.gray700,
  },
  askButtonSplit: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  chatButtonPressed: {
    backgroundColor: colors.sumi800,
  },
  chatButtonLabel: {
    ...typography.bodySm,
    fontFamily: fonts.medium,
    color: colors.gray50,
  },
});

function formatChatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
