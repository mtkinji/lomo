import { Activity, Goal } from '../../domain/types';

/**
 * Heuristically infer the scheduling domain ('work', 'personal', etc.) for an activity.
 * This can be expanded with AI in the future.
 */
export function inferSchedulingDomain(activity: Activity, goals: Goal[]): string {
  if (activity.schedulingDomain) return activity.schedulingDomain;

  const goal = goals.find((g) => g.id === activity.goalId);
  const title = (activity.title + ' ' + (goal?.title || '')).toLowerCase();

  // Intentionally broad: users often create meeting-style tasks without linking them to goals.
  // This is only used to choose availability windows (work vs personal), not as a permanent label.
  const WORK_KEYWORDS = [
    'work',
    'job',
    'client',
    'meeting',
    'project',
    'deadline',
    'office',
    'corp',
    'email',
    'call',
    'review',
    'validate',
    'align',
    'planning',
    'backlog',
    'prioritization',
    'marketing',
    'delivery',
    'use case',
    'roadmap',
    'strategy',
    'sync',
    'standup',
    'demo',
  ];
  if (WORK_KEYWORDS.some((kw) => title.includes(kw))) {
    return 'work';
  }

  return 'personal';
}

