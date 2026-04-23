import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { EmptyState, HStack, Input, Text, VStack } from '../../ui/primitives';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { menuItemTextProps } from '../../ui/menuStyles';
import { Icon, type IconName } from '../../ui/Icon';
import { colors, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import type { Activity, Arc, Goal } from '../../domain/types';
import {
  fetchMyChapters,
  type ChapterRow,
} from '../../services/chapters';
import {
  ALL_GLOBAL_SEARCH_SCOPES,
  activityPassesIncludeCompleted,
  formatChapterPeriodLabel,
  formatRelativeDays,
  getRecentArcs,
  getRecentChapters,
  getRecentGoals,
  searchArcs,
  searchChapters,
  searchGoals,
  type GlobalSearchScope,
} from './searchAlgorithms';
import {
  getRecommendedActivities,
  searchActivities,
} from '../activities/activitySearchAlgorithm';

type ScopeChipDef = {
  scope: GlobalSearchScope;
  label: string;
  icon: IconName;
};

const SCOPE_CHIPS: ScopeChipDef[] = [
  { scope: 'activities', label: 'Activities', icon: 'activities' },
  { scope: 'goals', label: 'Goals', icon: 'goals' },
  { scope: 'arcs', label: 'Arcs', icon: 'arcs' },
  { scope: 'chapters', label: 'Chapters', icon: 'chapters' },
];

const PER_KIND_LIMIT_IN_ALL = 5;
const PER_KIND_LIMIT_WHEN_SCOPED = 40;
const GLOBAL_RECOMMENDATIONS_LIMIT = 3;
const CHAPTER_FETCH_LIMIT = 60;

type UnifiedResultRow =
  | { kind: 'activity'; activity: Activity; goalTitle?: string }
  | { kind: 'goal'; goal: Goal; arcName?: string }
  | { kind: 'arc'; arc: Arc }
  | { kind: 'chapter'; chapter: ChapterRow };

export function GlobalSearchDrawer() {
  const open = useAppStore((s) => s.globalSearchOpen);
  const close = useAppStore((s) => s.closeGlobalSearch);

  const scopes = useAppStore((s) => s.globalSearchScopes);
  const setScopes = useAppStore((s) => s.setGlobalSearchScopes);
  const includeCompleted = useAppStore((s) => s.globalSearchIncludeCompleted);
  const setIncludeCompleted = useAppStore((s) => s.setGlobalSearchIncludeCompleted);
  const showMeta = useAppStore((s) => s.globalSearchShowMeta);
  const setShowMeta = useAppStore((s) => s.setGlobalSearchShowMeta);

  const activities = useAppStore((s) => s.activities);
  const goals = useAppStore((s) => s.goals);
  const arcs = useAppStore((s) => s.arcs);

  const [query, setQuery] = React.useState('');
  const [chapters, setChapters] = React.useState<ChapterRow[]>([]);
  const [chaptersLoading, setChaptersLoading] = React.useState(false);

  // Reset the query every time the drawer opens so the previous session's
  // text doesn't leak into the new invocation.
  React.useEffect(() => {
    if (!open) return;
    setQuery('');
  }, [open]);

  // Lazy-fetch chapters whenever the drawer is opened and the Chapters scope
  // is active. Cheap: at most ~60 rows, fetched once per open. We don't cache
  // across opens because Chapters rarely regenerate mid-session and a fresh
  // read is simpler than invalidation.
  React.useEffect(() => {
    if (!open) return;
    if (!scopes.chapters) return;
    let cancelled = false;
    setChaptersLoading(true);
    (async () => {
      try {
        const rows = await fetchMyChapters({ limit: CHAPTER_FETCH_LIMIT });
        if (!cancelled) setChapters(rows);
      } catch {
        if (!cancelled) setChapters([]);
      } finally {
        if (!cancelled) setChaptersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, scopes.chapters]);

  const activeScopeCount = ALL_GLOBAL_SEARCH_SCOPES.filter((s) => scopes[s]).length;
  // When exactly one chip is active we drop section headers and render a
  // Spotlight-style flat list.
  const soloScope: GlobalSearchScope | null =
    activeScopeCount === 1
      ? (ALL_GLOBAL_SEARCH_SCOPES.find((s) => scopes[s]) ?? null)
      : null;

  const arcNameById = React.useMemo(() => {
    const map: Record<string, string> = {};
    arcs.forEach((a) => {
      map[a.id] = a.name;
    });
    return map;
  }, [arcs]);

  const goalTitleById = React.useMemo(() => {
    const map: Record<string, string> = {};
    goals.forEach((g) => {
      map[g.id] = g.title;
    });
    return map;
  }, [goals]);

  const trimmedQuery = query.trim();
  const showingRecents = trimmedQuery.length === 0;
  const perKindLimit = soloScope ? PER_KIND_LIMIT_WHEN_SCOPED : PER_KIND_LIMIT_IN_ALL;

  const activityResults = React.useMemo<Activity[]>(() => {
    if (!scopes.activities) return [];
    const filtered = activities.filter((a) =>
      activityPassesIncludeCompleted(a, includeCompleted),
    );
    if (showingRecents) {
      // Reuse the existing recency-weighted recommender for consistency with
      // the old Activities drawer experience.
      return getRecommendedActivities({
        activities: filtered,
        limit: Math.min(perKindLimit, GLOBAL_RECOMMENDATIONS_LIMIT),
      });
    }
    return searchActivities({
      activities: filtered,
      query: trimmedQuery,
      goalTitleById,
    }).slice(0, perKindLimit);
  }, [
    activities,
    scopes.activities,
    goalTitleById,
    includeCompleted,
    perKindLimit,
    showingRecents,
    trimmedQuery,
  ]);

  const goalResults = React.useMemo<Goal[]>(() => {
    if (!scopes.goals) return [];
    if (showingRecents) {
      return getRecentGoals({ goals, includeClosed: includeCompleted, limit: perKindLimit });
    }
    return searchGoals({
      goals,
      query: trimmedQuery,
      includeClosed: includeCompleted,
      arcNameById,
    }).slice(0, perKindLimit);
  }, [
    arcNameById,
    scopes.goals,
    goals,
    includeCompleted,
    perKindLimit,
    showingRecents,
    trimmedQuery,
  ]);

  const arcResults = React.useMemo<Arc[]>(() => {
    if (!scopes.arcs) return [];
    if (showingRecents) {
      return getRecentArcs({ arcs, includeClosed: includeCompleted, limit: perKindLimit });
    }
    return searchArcs({
      arcs,
      query: trimmedQuery,
      includeClosed: includeCompleted,
    }).slice(0, perKindLimit);
  }, [arcs, scopes.arcs, includeCompleted, perKindLimit, showingRecents, trimmedQuery]);

  const chapterResults = React.useMemo<ChapterRow[]>(() => {
    if (!scopes.chapters) return [];
    if (showingRecents) {
      return getRecentChapters({ chapters, limit: perKindLimit });
    }
    return searchChapters({ chapters, query: trimmedQuery }).slice(0, perKindLimit);
  }, [chapters, scopes.chapters, perKindLimit, showingRecents, trimmedQuery]);

  type Section = { title: string; scope: GlobalSearchScope; rows: UnifiedResultRow[] };
  const sections = React.useMemo<Section[]>(() => {
    const all: Section[] = [];
    if (scopes.activities && activityResults.length > 0) {
      all.push({
        title: 'Activities',
        scope: 'activities',
        rows: activityResults.map((activity) => ({
          kind: 'activity' as const,
          activity,
          goalTitle: activity.goalId ? goalTitleById[activity.goalId] : undefined,
        })),
      });
    }
    if (scopes.goals && goalResults.length > 0) {
      all.push({
        title: 'Goals',
        scope: 'goals',
        rows: goalResults.map((goal) => ({
          kind: 'goal' as const,
          goal,
          arcName: goal.arcId ? arcNameById[goal.arcId] : undefined,
        })),
      });
    }
    if (scopes.arcs && arcResults.length > 0) {
      all.push({
        title: 'Arcs',
        scope: 'arcs',
        rows: arcResults.map((arc) => ({ kind: 'arc' as const, arc })),
      });
    }
    if (scopes.chapters && chapterResults.length > 0) {
      all.push({
        title: 'Chapters',
        scope: 'chapters',
        rows: chapterResults.map((chapter) => ({ kind: 'chapter' as const, chapter })),
      });
    }
    return all;
  }, [
    activityResults,
    arcNameById,
    arcResults,
    chapterResults,
    scopes.activities,
    scopes.arcs,
    scopes.chapters,
    scopes.goals,
    goalResults,
    goalTitleById,
  ]);

  const flatData = React.useMemo<
    Array<{ type: 'section'; scope: GlobalSearchScope; title: string } | { type: 'row'; row: UnifiedResultRow; scope: GlobalSearchScope }>
  >(() => {
    if (showingRecents) {
      // Empty-query mode: render one unified recommendations list (no per-kind
      // section headers) and rank globally across selected object types.
      return sections
        .flatMap((section) => {
          return section.rows.map((row, idx) => {
            const rankScore = 1 / (idx + 1);
            // Blend per-kind rank (already sorted by that kind's relevance
            // model) with a cross-kind recency factor so we can compare all
            // object types in one list without ordering bias by type.
            const globalScore = rankScore * 0.65 + getGlobalRecencyScore(row) * 0.35;
            return {
              type: 'row' as const,
              row,
              scope: section.scope,
              globalScore,
              rankIndex: idx,
            };
          });
        })
        .sort((a, b) => {
          if (b.globalScore !== a.globalScore) return b.globalScore - a.globalScore;
          const aDate = getRecommendationDateMs(a.row);
          const bDate = getRecommendationDateMs(b.row);
          if (bDate !== aDate) return bDate - aDate;
          if (a.rankIndex !== b.rankIndex) return a.rankIndex - b.rankIndex;
          if (a.scope !== b.scope) return a.scope.localeCompare(b.scope);
          return rowKey(a.row).localeCompare(rowKey(b.row));
        })
        .map(({ type, row, scope }) => ({ type, row, scope }))
        .slice(0, GLOBAL_RECOMMENDATIONS_LIMIT);
    }
    if (soloScope) {
      // When scoped to a single kind we drop the section header entirely and
      // render a flat, Spotlight-style list.
      const only = sections.find((section) => section.scope === soloScope);
      if (!only) return [];
      return only.rows.map((row) => ({ type: 'row' as const, row, scope: only.scope }));
    }
    const out: Array<
      | { type: 'section'; scope: GlobalSearchScope; title: string }
      | { type: 'row'; row: UnifiedResultRow; scope: GlobalSearchScope }
    > = [];
    sections.forEach((section) => {
      out.push({ type: 'section', scope: section.scope, title: section.title });
      section.rows.forEach((row) => {
        out.push({ type: 'row', row, scope: section.scope });
      });
    });
    return out;
  }, [sections, showingRecents, soloScope]);

  const handleNavigateTo = React.useCallback(
    (row: UnifiedResultRow) => {
      close();
      if (!rootNavigationRef.isReady()) return;
      switch (row.kind) {
        case 'activity': {
          rootNavigationRef.navigate('MainTabs', {
            screen: 'ActivitiesTab',
            params: {
              screen: 'ActivityDetail',
              params: { activityId: row.activity.id },
            },
          } as any);
          return;
        }
        case 'goal': {
          rootNavigationRef.navigate('MainTabs', {
            screen: 'MoreTab',
            params: {
              screen: 'MoreArcs',
              params: {
                screen: 'GoalDetail',
                params: { goalId: row.goal.id, entryPoint: 'arcsStack' },
              },
            },
          } as any);
          return;
        }
        case 'arc': {
          rootNavigationRef.navigate('MainTabs', {
            screen: 'MoreTab',
            params: {
              screen: 'MoreArcs',
              params: {
                screen: 'ArcDetail',
                params: { arcId: row.arc.id },
              },
            },
          } as any);
          return;
        }
        case 'chapter': {
          rootNavigationRef.navigate('MainTabs', {
            screen: 'MoreTab',
            params: {
              screen: 'MoreChapters',
              params: undefined,
            },
          } as any);
          // Second call to push the detail; the MoreChapters stack uses
          // separate screens for list + detail.
          rootNavigationRef.navigate('MainTabs', {
            screen: 'MoreTab',
            params: {
              screen: 'MoreChapterDetail',
              params: { chapterId: row.chapter.id },
            },
          } as any);
          return;
        }
      }
    },
    [close],
  );

  const handleToggleScope = React.useCallback(
    (scope: GlobalSearchScope) => {
      setScopes((current) => {
        const next = { ...current, [scope]: !current[scope] };
        // Guard: never allow all scopes to be off (collapses to empty state).
        const anyOn = ALL_GLOBAL_SEARCH_SCOPES.some((s) => next[s]);
        if (!anyOn) return current;
        return next;
      });
    },
    [setScopes],
  );

  const anyScopeMatches = flatData.length > 0;
  const hasRecommendationsHeader = showingRecents && anyScopeMatches;

  const emptyCopy = React.useMemo(() => {
    if (showingRecents) {
      return {
        title: soloScope ? `Search ${scopeLabel(soloScope)}` : 'Search Kwilt',
        instructions: soloScope
          ? `Start typing to search your ${scopeLabel(soloScope).toLowerCase()}.`
          : 'Start typing to search across Arcs, Goals, Activities, and Chapters.',
      };
    }
    return {
      title: 'No matches',
      instructions: 'Try a different search or widen your scopes.',
    };
  }, [showingRecents, soloScope]);

  return (
    <BottomDrawer
      visible={open}
      onClose={close}
      snapPoints={['100%']}
      keyboardAvoidanceEnabled={false}
    >
      <VStack flex={1} style={styles.container}>
        <BottomDrawerHeader
          title="Search"
          subtitle={
            soloScope
              ? `Find anything in your ${scopeLabel(soloScope).toLowerCase()}.`
              : 'Find anything across Kwilt.'
          }
          variant="withClose"
          onClose={close}
          containerStyle={styles.header}
          titleStyle={styles.headerTitle}
        />
        <View style={styles.searchRow}>
          <HStack space="sm" alignItems="center" style={styles.searchRowInner}>
            <View style={styles.searchInputContainer}>
              <Input
                value={query}
                onChangeText={setQuery}
                placeholder={soloScope ? `Search ${scopeLabel(soloScope).toLowerCase()}` : 'Search Kwilt'}
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
                  accessibilityState={{ checked: includeCompleted }}
                  onPress={() => setIncludeCompleted(!includeCompleted)}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                >
                  <Text style={styles.menuItemText} {...menuItemTextProps}>
                    Include completed & closed
                  </Text>
                  <View style={styles.menuSwitch} pointerEvents="none">
                    <Switch
                      value={includeCompleted}
                      onValueChange={() => {}}
                      trackColor={{ false: colors.border, true: colors.accent }}
                      thumbColor={colors.canvas}
                    />
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityLabel="Show metadata"
                  accessibilityState={{ checked: showMeta }}
                  onPress={() => setShowMeta(!showMeta)}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                >
                  <Text style={styles.menuItemText} {...menuItemTextProps}>
                    Show metadata
                  </Text>
                  <View style={styles.menuSwitch} pointerEvents="none">
                    <Switch
                      value={showMeta}
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
        <View style={styles.chipRow}>
          {SCOPE_CHIPS.map((chip) => {
            const active = scopes[chip.scope];
            return (
              <Pressable
                key={chip.scope}
                accessibilityRole="button"
                accessibilityLabel={`${active ? 'Exclude' : 'Include'} ${chip.label}`}
                accessibilityState={{ selected: active }}
                onPress={() => handleToggleScope(chip.scope)}
                style={({ pressed }) => [
                  styles.chip,
                  active ? styles.chipActive : styles.chipInactive,
                  pressed && styles.chipPressed,
                ]}
              >
                <Icon
                  name={chip.icon}
                  size={12}
                  color={active ? colors.pine700 : colors.textSecondary}
                />
                <Text
                  style={[styles.chipLabel, active ? styles.chipLabelActive : styles.chipLabelInactive]}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <FlatList
          data={flatData}
          keyExtractor={(entry, index) =>
            entry.type === 'section'
              ? `section:${entry.scope}`
              : `${entry.scope}:${rowKey(entry.row)}:${index}`
          }
          renderItem={({ item }) => {
            if (item.type === 'section') {
              return (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{item.title}</Text>
                </View>
              );
            }
            return (
              <SearchRow
                row={item.row}
                soloScope={soloScope}
                showMeta={showMeta}
                goalTitleById={goalTitleById}
                arcNameById={arcNameById}
                onPress={() => handleNavigateTo(item.row)}
              />
            );
          }}
          ListHeaderComponent={
            hasRecommendationsHeader ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recommendations</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              variant="compact"
              iconName="search"
              title={emptyCopy.title}
              instructions={
                chaptersLoading && showingRecents && soloScope === 'chapters'
                  ? 'Loading your chapters…'
                  : emptyCopy.instructions
              }
              style={styles.emptyState}
            />
          }
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={
            soloScope || showingRecents
              ? undefined
              : flatData.reduce<number[]>((acc, entry, idx) => {
                  if (entry.type === 'section') acc.push(idx);
                  return acc;
                }, [])
          }
        />
        {!anyScopeMatches && !showingRecents ? null : null}
      </VStack>
    </BottomDrawer>
  );
}

function scopeLabel(scope: GlobalSearchScope): string {
  switch (scope) {
    case 'activities':
      return 'Activities';
    case 'goals':
      return 'Goals';
    case 'arcs':
      return 'Arcs';
    case 'chapters':
      return 'Chapters';
  }
}

function rowKey(row: UnifiedResultRow): string {
  switch (row.kind) {
    case 'activity':
      return row.activity.id;
    case 'goal':
      return row.goal.id;
    case 'arc':
      return row.arc.id;
    case 'chapter':
      return row.chapter.id;
  }
}

function getRecommendationDateMs(row: UnifiedResultRow): number {
  const parseMs = (iso: string | null | undefined): number => {
    if (!iso) return 0;
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? ms : 0;
  };
  switch (row.kind) {
    case 'activity':
      return parseMs(row.activity.updatedAt ?? row.activity.createdAt);
    case 'goal':
      return parseMs(row.goal.updatedAt ?? row.goal.createdAt);
    case 'arc':
      return parseMs(row.arc.updatedAt ?? row.arc.createdAt);
    case 'chapter':
      // Chapters are periodic snapshots; `period_start` better matches user
      // mental model ("most recent week") than insertion timestamp.
      return parseMs(row.chapter.period_start);
  }
}

function getGlobalRecencyScore(row: UnifiedResultRow): number {
  const ms = getRecommendationDateMs(row);
  if (!ms) return 0;
  const days = Math.max(0, (Date.now() - ms) / (1000 * 60 * 60 * 24));
  if (days <= 3) return 1;
  if (days <= 7) return 0.8;
  if (days <= 14) return 0.6;
  if (days <= 30) return 0.4;
  return 0.2;
}

type SearchRowProps = {
  row: UnifiedResultRow;
  soloScope: GlobalSearchScope | null;
  showMeta: boolean;
  goalTitleById: Record<string, string>;
  arcNameById: Record<string, string>;
  onPress: () => void;
};

function SearchRow({ row, soloScope, showMeta, goalTitleById, arcNameById, onPress }: SearchRowProps) {
  const { icon, title, meta } = describeRow(row, { goalTitleById, arcNameById });
  const isActivity = row.kind === 'activity';
  const isActivityLocked = isActivity && soloScope === 'activities';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowIcon}>
        <Icon name={icon} size={16} color={colors.textSecondary} />
      </View>
      <View style={styles.rowBody}>
        <Text
          style={[
            styles.rowTitle,
            isActivityLocked && (row as Extract<UnifiedResultRow, { kind: 'activity' }>).activity.status === 'done'
              ? styles.rowTitleCompleted
              : null,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {showMeta && meta ? (
          <Text style={styles.rowMeta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function describeRow(
  row: UnifiedResultRow,
  ctx: { goalTitleById: Record<string, string>; arcNameById: Record<string, string> },
): { icon: IconName; title: string; meta?: string } {
  switch (row.kind) {
    case 'activity': {
      const goalTitle = row.activity.goalId ? ctx.goalTitleById[row.activity.goalId] : undefined;
      const rel = formatRelativeDays(row.activity.updatedAt ?? row.activity.createdAt);
      const parts: string[] = [];
      if (goalTitle) parts.push(goalTitle);
      if (rel) parts.push(rel);
      return {
        // Match the object-kind glyph used elsewhere in the app (bottom tab,
        // nav). Feather's `activity` pulse line looks like a status indicator
        // rather than an object type, which reads wrong here.
        icon: 'activities',
        title: row.activity.title || 'Untitled activity',
        meta: parts.length > 0 ? parts.join(' • ') : undefined,
      };
    }
    case 'goal': {
      const arcName = row.goal.arcId ? ctx.arcNameById[row.goal.arcId] : undefined;
      const rel = formatRelativeDays(row.goal.updatedAt ?? row.goal.createdAt);
      const parts: string[] = [];
      if (arcName) parts.push(arcName);
      if (rel) parts.push(rel);
      return {
        icon: 'goals',
        title: row.goal.title || 'Untitled goal',
        meta: parts.length > 0 ? parts.join(' • ') : undefined,
      };
    }
    case 'arc': {
      const rel = formatRelativeDays(row.arc.updatedAt ?? row.arc.createdAt);
      const statusLabel = row.arc.status === 'active' ? undefined : row.arc.status;
      const parts: string[] = [];
      if (statusLabel) parts.push(statusLabel);
      if (rel) parts.push(rel);
      return {
        icon: 'arcs',
        title: row.arc.name || 'Untitled arc',
        meta: parts.length > 0 ? parts.join(' • ') : undefined,
      };
    }
    case 'chapter': {
      const title =
        (typeof row.chapter.output_json?.title === 'string' && row.chapter.output_json.title) ||
        `Chapter ${row.chapter.period_key}`;
      const periodLabel = formatChapterPeriodLabel(row.chapter);
      return {
        icon: 'chapters',
        title,
        meta: periodLabel,
      };
    }
  }
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: spacing.xs,
    marginBottom: 4,
  },
  chipActive: {
    backgroundColor: colors.pine50,
    borderColor: colors.pine200,
  },
  chipInactive: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  chipPressed: {
    opacity: 0.6,
  },
  chipLabel: {
    ...typography.caption,
    marginLeft: 5,
    fontWeight: '600',
    includeFontPadding: false,
  },
  chipLabelActive: {
    color: colors.pine700,
  },
  chipLabelInactive: {
    color: colors.textSecondary,
  },
  sectionHeader: {
    paddingTop: spacing.md,
    paddingBottom: 6,
    backgroundColor: colors.canvas,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 6,
  },
  rowPressed: {
    backgroundColor: colors.gray100,
  },
  rowIcon: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  rowTitle: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
    minWidth: 0,
  },
  rowTitleCompleted: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  rowMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
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
  emptyState: {
    marginTop: spacing.xl,
  },
});
