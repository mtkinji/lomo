import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BottomDrawer, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { HStack, Input, Text, VStack } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { menuItemTextProps } from '../../ui/menuStyles';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { ActivityTagGroup } from './tagGroups';

export function TagGroupsDrawer({
  visible,
  tagGroups,
  activeTagGroupLabel,
  onClose,
  onApplyTagGroup,
  onClearTagGroup,
}: {
  visible: boolean;
  tagGroups: ActivityTagGroup[];
  activeTagGroupLabel: string | null;
  onClose: () => void;
  onApplyTagGroup: (tag: string) => void;
  onClearTagGroup: () => void;
}) {
  const [query, setQuery] = React.useState('');
  const visibleTagGroups = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tagGroups;
    return tagGroups.filter((group) => group.key.includes(q) || group.tag.toLowerCase().includes(q));
  }, [query, tagGroups]);

  React.useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['70%']} keyboardAvoidanceEnabled={false}>
      <View style={styles.container}>
        <BottomDrawerHeader
          title="Tags"
          variant="withClose"
          onClose={onClose}
          containerStyle={styles.header}
          titleStyle={styles.title}
        />
        <BottomDrawerScrollView contentContainerStyle={styles.content}>
          <VStack space="xs">
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search tags..."
              leadingIcon="search"
              size="sm"
              returnKeyType="search"
              containerStyle={styles.searchInput}
            />
            {activeTagGroupLabel ? (
              <TagRow
                label="Clear tag"
                icon="close"
                selected={false}
                onPress={onClearTagGroup}
              />
            ) : null}
            {visibleTagGroups.map((group) => (
              <TagRow
                key={`all-tag-${group.key}`}
                label={group.tag}
                count={group.activeCount}
                icon={activeTagGroupLabel === group.tag ? 'check' : 'tag'}
                selected={activeTagGroupLabel === group.tag}
                onPress={() => onApplyTagGroup(group.tag)}
              />
            ))}
            {visibleTagGroups.length === 0 ? (
              <Text style={styles.emptyText}>No matching tags</Text>
            ) : null}
          </VStack>
        </BottomDrawerScrollView>
      </View>
    </BottomDrawer>
  );
}

function TagRow({
  label,
  count,
  icon,
  selected,
  onPress,
}: {
  label: string;
  count?: number;
  icon: 'check' | 'tag' | 'close';
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.row}
    >
      <HStack alignItems="center" justifyContent="space-between" space="sm" flex={1}>
        <HStack alignItems="center" space="xs" style={styles.labelWrap}>
          <Icon
            name={icon}
            size={14}
            color={selected ? colors.accent : colors.textSecondary}
          />
          <Text style={styles.rowText} {...menuItemTextProps}>
            {label}
          </Text>
        </HStack>
        {typeof count === 'number' ? <Text style={styles.countText}>{count}</Text> : null}
      </HStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  title: {
    textAlign: 'left',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  searchInput: {
    marginBottom: spacing.xs,
  },
  row: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 8,
    justifyContent: 'center',
  },
  labelWrap: {
    flex: 1,
  },
  rowText: {
    color: colors.textPrimary,
  },
  countText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontSize: 12,
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
