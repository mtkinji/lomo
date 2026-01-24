import React from 'react';
import { FlatList, Pressable, StyleSheet, Switch, View } from 'react-native';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { ActivityListItem } from '../../ui/ActivityListItem';
import { EmptyState } from '../../ui/EmptyState';
import { Input, Text, VStack, HStack } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';
import { Icon } from '../../ui/Icon';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../../ui/DropdownMenu';
import { menuItemTextProps } from '../../ui/menuStyles';
import type { Activity } from '../../domain/types';
import { buildActivityListMeta } from '../../utils/activityListMeta';
import { getRecommendedActivities, searchActivities } from './activitySearchAlgorithm';
import { useAppStore } from '../../store/useAppStore';

type ActivitySearchDrawerProps = {
  visible: boolean;
  onClose: () => void;
  activities: Activity[];
  goalTitleById: Record<string, string>;
  onPressActivity: (activityId: string) => void;
  onToggleComplete?: (activityId: string) => void;
  onTogglePriority?: (activityId: string) => void;
};

export function ActivitySearchDrawer({
  visible,
  onClose,
  activities,
  goalTitleById,
  onPressActivity,
  onToggleComplete,
  onTogglePriority,
}: ActivitySearchDrawerProps) {
  const [query, setQuery] = React.useState('');
  const includeCompleted = useAppStore((s) => s.activitySearchIncludeCompleted);
  const setIncludeCompleted = useAppStore((s) => s.setActivitySearchIncludeCompleted);
  const showCheckCircle = useAppStore((s) => s.activitySearchShowCheckCircle);
  const setShowCheckCircle = useAppStore((s) => s.setActivitySearchShowCheckCircle);
  const showMetaRow = useAppStore((s) => s.activitySearchShowMeta);
  const setShowMetaRow = useAppStore((s) => s.setActivitySearchShowMeta);
  const [includeCompletedLocal, setIncludeCompletedLocal] = React.useState(includeCompleted);
  const [showCheckCircleLocal, setShowCheckCircleLocal] = React.useState(showCheckCircle);
  const [showMetaRowLocal, setShowMetaRowLocal] = React.useState(showMetaRow);

  React.useEffect(() => {
    if (!visible) {
      setQuery('');
    }
  }, [visible]);

  React.useEffect(() => {
    setIncludeCompletedLocal(includeCompleted);
  }, [includeCompleted]);

  React.useEffect(() => {
    setShowCheckCircleLocal(showCheckCircle);
  }, [showCheckCircle]);

  React.useEffect(() => {
    setShowMetaRowLocal(showMetaRow);
  }, [showMetaRow]);

  const trimmedQuery = query.trim();
  
  // Filter activities based on includeCompleted preference
  const filteredActivities = React.useMemo(() => {
    if (includeCompletedLocal) return activities;
    return activities.filter((a) => a.status !== 'done' && a.status !== 'cancelled');
  }, [activities, includeCompletedLocal]);
  
  const recommendations = React.useMemo(
    () => getRecommendedActivities({ activities: filteredActivities, limit: 3 }),
    [filteredActivities],
  );
  const results = React.useMemo(
    () => searchActivities({ activities: filteredActivities, query: trimmedQuery, goalTitleById }),
    [filteredActivities, goalTitleById, trimmedQuery],
  );
  const showRecommendations = trimmedQuery.length === 0;
  const data = showRecommendations ? recommendations : results;

  const handleSelect = React.useCallback(
    (activityId: string) => {
      onClose();
      onPressActivity(activityId);
    },
    [onClose, onPressActivity],
  );

  const renderItem = React.useCallback(
    ({ item }: { item: Activity }) => {
      const goalTitle = item.goalId ? goalTitleById[item.goalId] : undefined;
      const metaInfo = showMetaRowLocal
        ? buildActivityListMeta({ activity: item, goalTitle })
        : {
            meta: undefined,
            metaLeadingIconName: undefined,
            metaLeadingIconNames: undefined,
            isDueToday: undefined,
          };
      return (
        <View style={styles.itemWrap}>
          <ActivityListItem
            title={item.title}
            meta={metaInfo.meta}
            metaLeadingIconName={metaInfo.metaLeadingIconName}
            metaLeadingIconNames={metaInfo.metaLeadingIconNames}
            isCompleted={item.status === 'done'}
            onToggleComplete={
              showCheckCircleLocal && onToggleComplete ? () => onToggleComplete(item.id) : undefined
            }
            showCheckbox={showCheckCircleLocal}
            isPriorityOne={item.priority === 1}
            onTogglePriority={onTogglePriority ? () => onTogglePriority(item.id) : undefined}
            onPress={() => handleSelect(item.id)}
            isDueToday={metaInfo.isDueToday}
            showPriorityControl={Boolean(onTogglePriority)}
          />
        </View>
      );
    },
    [
      goalTitleById,
      handleSelect,
      onToggleComplete,
      onTogglePriority,
      showCheckCircleLocal,
      showMetaRowLocal,
    ],
  );

  const listHeader = (
    <VStack space="xs" style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {showRecommendations ? 'Recommended' : 'Results'}
      </Text>
    </VStack>
  );

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['100%']}
      keyboardAvoidanceEnabled={false}
    >
      <VStack flex={1} style={styles.container}>
        <BottomDrawerHeader
          title="Search activities"
          subtitle="Find anything in your activity library."
          variant="withClose"
          onClose={onClose}
          containerStyle={styles.header}
          titleStyle={styles.headerTitle}
        />
        <View style={styles.searchRow}>
          <HStack space="sm" alignItems="center" style={styles.searchRowInner}>
            <View style={styles.searchInputContainer}>
              <Input
                value={query}
                onChangeText={setQuery}
                placeholder="Search activities"
                leadingIcon="search"
                autoFocus
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
                returnKeyType="search"
              />
            </View>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Pressable
                  accessibilityLabel="Search options"
                  style={styles.menuButton}
                >
                  <Icon name="more" size={20} color={colors.textPrimary} />
                </Pressable>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" style={{ minWidth: 240 }}>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityLabel="Include completed and closed"
                  accessibilityState={{ checked: includeCompletedLocal }}
                  onPress={() => {
                    const next = !includeCompletedLocal;
                    setIncludeCompletedLocal(next);
                    setIncludeCompleted(next);
                  }}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                >
                  <Text style={styles.menuItemText} {...menuItemTextProps}>
                    Include completed & closed
                  </Text>
                  <View style={styles.menuSwitch} pointerEvents="none">
                    <Switch
                      value={includeCompletedLocal}
                      onValueChange={() => {}}
                      trackColor={{ false: colors.border, true: colors.accent }}
                      thumbColor={colors.canvas}
                    />
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityLabel="Show check circle"
                  accessibilityState={{ checked: showCheckCircleLocal }}
                  onPress={() => {
                    const next = !showCheckCircleLocal;
                    setShowCheckCircleLocal(next);
                    setShowCheckCircle(next);
                  }}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                >
                  <Text style={styles.menuItemText} {...menuItemTextProps}>
                    Show check circle
                  </Text>
                  <View style={styles.menuSwitch} pointerEvents="none">
                    <Switch
                      value={showCheckCircleLocal}
                      onValueChange={() => {}}
                      trackColor={{ false: colors.border, true: colors.accent }}
                      thumbColor={colors.canvas}
                    />
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityLabel="Show metadata"
                  accessibilityState={{ checked: showMetaRowLocal }}
                  onPress={() => {
                    const next = !showMetaRowLocal;
                    setShowMetaRowLocal(next);
                    setShowMetaRow(next);
                  }}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                >
                  <Text style={styles.menuItemText} {...menuItemTextProps}>
                    Show metadata
                  </Text>
                  <View style={styles.menuSwitch} pointerEvents="none">
                    <Switch
                      value={showMetaRowLocal}
                      onValueChange={() => {}}
                      trackColor={{ false: colors.border, true: colors.accent }}
                      thumbColor={colors.canvas}
                    />
                  </View>
                </Pressable>
              </DropdownMenuContent>
            </DropdownMenu>
          </HStack>
        </View>
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={data.length > 0 ? listHeader : null}
          ListEmptyComponent={
            <EmptyState
              variant="compact"
              iconName="search"
              title={showRecommendations ? 'Search activities' : 'No matches'}
              instructions={
                showRecommendations
                  ? 'Start typing to search across all activities.'
                  : 'Try a different search.'
              }
              style={styles.emptyState}
            />
          }
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        />
      </VStack>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    textAlign: 'left',
  },
  searchRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  searchRowInner: {
    width: '100%',
  },
  searchInputContainer: {
    flex: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  menuItemPressed: {
    backgroundColor: colors.gray100,
  },
  menuItemText: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },
  menuSwitch: {
    marginLeft: 'auto',
    transform: [{ scale: 0.85 }],
  },
  sectionHeader: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  sectionSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  itemWrap: {
    paddingBottom: spacing.xs / 2,
  },
  emptyState: {
    marginTop: spacing.xl,
  },
});

