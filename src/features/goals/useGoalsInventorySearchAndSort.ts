import React from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { richTextToPlainText } from '../../ui/richText';
import { sortGoalInventoryItems, type GoalInventorySortMode } from './goalsInventorySort';

const GOALS_SEARCH_REVEAL_OFFSET = -42;
const GOALS_SEARCH_COLLAPSE_OFFSET = 24;

type GoalInventorySearchItem = {
  goal: {
    id: string;
    title: string;
    description?: string;
    updatedAt?: string | null;
  };
  parentArc: { name: string } | null;
  activityCount: number;
  nextScheduledLabel: string | null;
};

type Args<T extends GoalInventorySearchItem> = {
  visibleItems: T[];
  archivedItems: T[];
  showArchived: boolean;
  getNextScheduledMs: (item: T) => number | null | undefined;
};

export function useGoalsInventorySearchAndSort<T extends GoalInventorySearchItem>({
  visibleItems,
  archivedItems,
  showArchived,
  getNextScheduledMs,
}: Args<T>) {
  const [searchRevealed, setSearchRevealed] = React.useState(false);
  const [goalSearchQuery, setGoalSearchQuery] = React.useState('');
  const [goalSortMode, setGoalSortMode] = React.useState<GoalInventorySortMode>('default');
  const trimmedGoalSearchQuery = goalSearchQuery.trim();
  const isSearchingGoals = trimmedGoalSearchQuery.length > 0;

  const filterItems = React.useCallback(
    (items: T[]) => {
      const query = trimmedGoalSearchQuery.toLowerCase();
      if (!query) return items;

      return items.filter((item) => {
        const searchable = [
          item.goal.title,
          item.goal.description ? richTextToPlainText(item.goal.description) : '',
          item.parentArc?.name,
          item.nextScheduledLabel,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchable.includes(query);
      });
    },
    [trimmedGoalSearchQuery],
  );

  const displayedVisibleItems = React.useMemo(
    () => sortGoalInventoryItems(filterItems(visibleItems), goalSortMode, getNextScheduledMs),
    [filterItems, getNextScheduledMs, goalSortMode, visibleItems],
  );

  const displayedArchivedItems = React.useMemo(
    () => sortGoalInventoryItems(filterItems(archivedItems), goalSortMode, getNextScheduledMs),
    [archivedItems, filterItems, getNextScheduledMs, goalSortMode],
  );

  const hasVisibleResults = displayedVisibleItems.length > 0;
  const hasArchivedResults = displayedArchivedItems.length > 0;
  const shouldShowSearch = searchRevealed || isSearchingGoals;
  const shouldShowEmptyState =
    !hasVisibleResults && !(isSearchingGoals && showArchived && hasArchivedResults);

  const handleScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y ?? 0;
      if (y <= GOALS_SEARCH_REVEAL_OFFSET) {
        setSearchRevealed(true);
        return;
      }
      if (!isSearchingGoals && y >= GOALS_SEARCH_COLLAPSE_OFFSET) {
        setSearchRevealed(false);
      }
    },
    [isSearchingGoals],
  );

  const handleClearSearch = React.useCallback(() => {
    setGoalSearchQuery('');
    setSearchRevealed(false);
  }, []);

  return {
    displayedVisibleItems,
    displayedArchivedItems,
    goalSearchQuery,
    setGoalSearchQuery,
    goalSortMode,
    setGoalSortMode,
    isSearchingGoals,
    shouldShowSearch,
    shouldShowEmptyState,
    hasVisibleResults,
    hasArchivedResults,
    handleScroll,
    handleClearSearch,
  };
}
