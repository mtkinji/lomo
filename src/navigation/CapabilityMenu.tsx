import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableProps,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { CAPABILITY_GROUPS, CAPABILITY_REGISTRY } from '../capabilities/registry';
import type { CapabilityGroupId, CapabilityId } from '../capabilities/types';
import { colors, fonts, spacing, typography } from '../theme';
import { BrandLockup } from '../ui/BrandLockup';
import { Icon } from '../ui/Icon';
import { ProfileAvatar } from '../ui/ProfileAvatar';

type CapabilityMenuProps = {
  activeCapabilityId: CapabilityId | null;
  activeChatThreadId?: string | null;
  chats: readonly CapabilityMenuChat[];
  chatsLoading?: boolean;
  chatsError?: string | null;
  displayName?: string;
  avatarUrl?: string | null;
  onSelectCapability: (id: CapabilityId) => void;
  onSelectChat: (threadId: string) => void;
  onArchiveChat: (threadId: string) => void;
  onDeleteChat: (threadId: string) => void;
  onCreateChat: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenChat: () => void;
};

export type CapabilityMenuChat = {
  id: string;
  title: string;
  updatedAt: string;
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
  onSelectChat,
  onArchiveChat,
  onDeleteChat,
  onCreateChat,
  onOpenSearch,
  onOpenSettings,
  onOpenChat,
}: CapabilityMenuProps) {
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<CapabilityGroupId>>(
    () => new Set(CAPABILITY_GROUPS.map(({ id }) => id)),
  );

  const toggleGroup = (id: CapabilityGroupId) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderCapability = (id: CapabilityId) => {
    const capability = CAPABILITY_REGISTRY.find((candidate) => candidate.id === id);
    if (!capability || capability.availability !== 'active') return null;
    const selected = activeCapabilityId === capability.id;

    return (
      <Pressable
        key={capability.id}
        accessibilityRole="button"
        accessibilityLabel={capability.label}
        accessibilityState={{ selected }}
        testID={`capability.menu.${capability.id}`}
        onPress={() => onSelectCapability(capability.id)}
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
          {capability.label}
        </Text>
      </Pressable>
    );
  };

  const directCapabilities = CAPABILITY_REGISTRY.filter(({ group }) => group === null);

  return (
    <View style={styles.root}>
      <BrandLockup logoSize={28} wordmarkSize="sm" style={styles.brand} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search Kwilt"
        onPress={onOpenSearch}
        style={({ pressed }) => [styles.searchRow, pressed && styles.rowPressed]}
      >
        <Icon name="search" size={18} color={colors.textSecondary} />
        <Text style={styles.searchLabel}>Search</Text>
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {CAPABILITY_GROUPS.map((group) => {
          const expanded = expandedGroups.has(group.id);
          const capabilityIds = CAPABILITY_REGISTRY.filter(
            (capability) => capability.group === group.id,
          ).map(({ id }) => id);

          return (
            <View key={group.id} style={styles.group}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${group.label}`}
                accessibilityState={{ expanded }}
                onPress={() => toggleGroup(group.id)}
                style={({ pressed }) => [styles.groupHeader, pressed && styles.rowPressed]}
              >
                <Text style={styles.groupLabel}>{group.label.toUpperCase()}</Text>
                <Icon
                  name={expanded ? 'chevronUp' : 'chevronDown'}
                  size={15}
                  color={colors.muted}
                />
              </Pressable>
              {expanded ? capabilityIds.map(renderCapability) : null}
            </View>
          );
        })}

        {directCapabilities.map(({ id }) => renderCapability(id))}

        <View style={styles.chatsHeader}>
          <Text style={styles.groupLabel}>CHATS</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New chat"
            onPress={onCreateChat}
            hitSlop={6}
            style={({ pressed }) => [styles.newChatButton, pressed && styles.rowPressed]}
          >
            <Icon name="plus" size={17} color={colors.textPrimary} />
          </Pressable>
        </View>
        {chatsLoading && chats.length === 0 ? (
          <View style={styles.chatStateRow}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
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
            onOpen={() => onSelectChat(chat.id)}
            onArchive={() => onArchiveChat(chat.id)}
            onDelete={() => onDeleteChat(chat.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile and settings"
          onPress={onOpenSettings}
          hitSlop={6}
          style={({ pressed }) => [styles.avatarButton, pressed && styles.rowPressed]}
        >
          <ProfileAvatar name={displayName} avatarUrl={avatarUrl} size={36} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open chat"
          onPress={onOpenChat}
          style={({ pressed }) => [styles.chatButton, pressed && styles.chatButtonPressed]}
        >
          <Icon name="navAiGuide" size={17} color={colors.gray50} />
          <Text style={styles.chatButtonLabel}>Chat</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CapabilityMenuChatRow({
  chat,
  selected,
  onOpen,
  onArchive,
  onDelete,
}: {
  chat: CapabilityMenuChat;
  selected: boolean;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
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
        accessibilityRole="button"
        accessibilityLabel={`Open chat ${chat.title}`}
        accessibilityState={{ selected }}
        accessibilityActions={[
          { name: 'archive', label: `Archive ${chat.title}` },
          { name: 'delete', label: `Delete ${chat.title}` },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'archive') onArchive();
          if (event.nativeEvent.actionName === 'delete') onDelete();
        }}
        onPress={onOpen}
        style={({ pressed }) => [
          styles.chatRow,
          selected && styles.capabilityRowSelected,
          pressed && styles.rowPressed,
        ]}
      >
        <Icon name="navAiGuide" size={17} color={colors.textSecondary} />
        <View style={styles.chatRowText}>
          <Text numberOfLines={1} style={styles.chatTitle}>{chat.title}</Text>
          <Text style={styles.chatDate}>{formatChatDate(chat.updatedAt)}</Text>
        </View>
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
  brand: {
    marginBottom: spacing.lg,
  },
  searchRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.gray50,
  },
  searchLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  scroll: {
    flex: 1,
    marginTop: spacing.lg,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  group: {
    marginBottom: spacing.sm,
  },
  groupHeader: {
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
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  capabilityLabelSelected: {
    fontFamily: fonts.medium,
    color: colors.gray800,
  },
  rowPressed: {
    opacity: 0.62,
  },
  chatsHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
  },
  newChatButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
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
  avatarButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    borderRadius: 22,
  },
  chatButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    backgroundColor: colors.sumi900,
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
