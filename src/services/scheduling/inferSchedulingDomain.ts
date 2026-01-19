import { Activity, Goal } from '../../domain/types';

/**
 * Heuristically infer the scheduling domain ('work', 'personal', etc.) for an activity.
 * This can be expanded with AI in the future.
 */
export function inferSchedulingDomain(activity: Activity, goals: Goal[]): string {
  if (activity.schedulingDomain) return activity.schedulingDomain;

  const goal = goals.find((g) => g.id === activity.goalId);
  if (!goal) return 'personal';

  const title = (activity.title + ' ' + (goal.title || '')).toLowerCase();

  const WORK_KEYWORDS = ['work', 'job', 'client', 'meeting', 'project', 'deadline', 'office', 'corp', 'email', 'call'];
  if (WORK_KEYWORDS.some((kw) => title.includes(kw))) {
    return 'work';
  }

  return 'personal';
}

