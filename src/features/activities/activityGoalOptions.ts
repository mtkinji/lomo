import type { Goal } from '../../domain/types';
import type { PickerFieldOption } from '../../ui/primitives';

export function isSelectableLinkedGoal(goal: Goal): boolean {
  return goal.status !== 'completed' && goal.status !== 'archived';
}

export function buildLinkedGoalOptions(goals: Goal[]): PickerFieldOption[] {
  return goals
    .filter(isSelectableLinkedGoal)
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((goal) => ({ value: goal.id, label: goal.title }));
}
