import type { Goal } from '../../domain/types';
import type { ObjectPickerOption } from '../../ui/ObjectPicker';

export function isSelectableLinkedGoal(goal: Goal): boolean {
  return goal.status !== 'completed' && goal.status !== 'archived';
}

export function buildLinkedGoalOptions(goals: Goal[]): ObjectPickerOption[] {
  return goals
    .filter(isSelectableLinkedGoal)
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((goal) => ({ value: goal.id, label: goal.title }));
}
