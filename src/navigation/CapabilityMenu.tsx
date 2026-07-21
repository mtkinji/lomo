import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CAPABILITY_GROUPS, CAPABILITY_REGISTRY } from '../capabilities/registry';
import type { CapabilityGroupId, CapabilityId } from '../capabilities/types';
import { colors, fonts, spacing, typography } from '../theme';
import { BrandLockup } from '../ui/BrandLockup';
import { Icon } from '../ui/Icon';
import { ProfileAvatar } from '../ui/ProfileAvatar';

type CapabilityMenuProps = {
  activeCapabilityId: CapabilityId | null;
  displayName?: string;
  avatarUrl?: string | null;
  onSelectCapability: (id: CapabilityId) => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenAgent: () => void;
};

export function CapabilityMenu({
  activeCapabilityId,
  displayName,
  avatarUrl,
  onSelectCapability,
  onOpenSearch,
  onOpenSettings,
  onOpenAgent,
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
          color={selected ? colors.pine700 : colors.textSecondary}
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

        <Text style={[styles.groupLabel, styles.chatsLabel]}>CHATS</Text>
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
          onPress={onOpenAgent}
          style={({ pressed }) => [styles.chatButton, pressed && styles.chatButtonPressed]}
        >
          <Icon name="navAiGuide" size={17} color={colors.parchment} />
          <Text style={styles.chatButtonLabel}>Chat</Text>
        </Pressable>
      </View>
    </View>
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
    backgroundColor: colors.pine50,
  },
  capabilityLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  capabilityLabelSelected: {
    fontFamily: fonts.medium,
    color: colors.pine700,
  },
  rowPressed: {
    opacity: 0.62,
  },
  chatsLabel: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    textAlignVertical: 'center',
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
    backgroundColor: colors.pine700,
  },
  chatButtonPressed: {
    backgroundColor: colors.pine800,
  },
  chatButtonLabel: {
    ...typography.bodySm,
    fontFamily: fonts.medium,
    color: colors.parchment,
  },
});
