import {act, renderHook} from '@testing-library/react-native';
import {useGoalsInventorySearchAndSort} from './useGoalsInventorySearchAndSort';

it('collapses cleared search without resetting the selected sort or filtered inventory', () => {
  const items = [
    {goal: {id: 'walk', title: 'Walk outside'}, parentArc: null, activityCount: 0, nextScheduledLabel: null},
    {goal: {id: 'cook', title: 'Cook dinner'}, parentArc: null, activityCount: 0, nextScheduledLabel: null},
  ];
  const {result} = renderHook(() => useGoalsInventorySearchAndSort({visibleItems: items, archivedItems: [], showArchived: false, getNextScheduledMs: () => null}));
  act(() => {
    result.current.setGoalSortMode('titleAsc');
    result.current.setGoalSearchQuery('walk');
  });
  expect(result.current.displayedVisibleItems.map(item => item.goal.id)).toEqual(['walk']);
  expect(result.current.shouldShowSearch).toBe(true);
  act(() => {
    result.current.setGoalSearchQuery('');
    result.current.handleSearchCleared();
  });
  expect(result.current.shouldShowSearch).toBe(false);
  expect(result.current.goalSortMode).toBe('titleAsc');
  expect(result.current.displayedVisibleItems.map(item => item.goal.id)).toEqual(['cook', 'walk']);
});
