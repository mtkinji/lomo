import type { Arc, Goal, Activity } from '../../domain/types';

/**
 * Shared helper for building a natural-language snapshot of the user's
 * existing Arcs and Goals. This is passed into AgentWorkspace as a hidden
 * context string so the coach can propose complementary Arcs or Goals.
 */
export function buildArcCoachLaunchContext(
  arcs: Arc[],
  goals: Goal[]
): string | undefined {
  if (arcs.length === 0 && goals.length === 0) {
    return undefined;
  }

  const lines: string[] = [];

  lines.push(
    'Existing workspace snapshot: the user already has the following arcs and goals. Use this to keep new suggestions distinctive and complementary.'
  );
  lines.push(`Total arcs: ${arcs.length}. Total goals: ${goals.length}.`);
  lines.push('');

  arcs.forEach((arc) => {
    const arcGoals = goals.filter((goal) => goal.arcId === arc.id);

    lines.push(`Arc: ${arc.name} (status: ${arc.status}).`);
    if (arc.narrative) {
      lines.push(`Narrative: ${arc.narrative}`);
    }

    if (arcGoals.length > 0) {
      lines.push('Goals in this arc:');
      arcGoals.forEach((goal) => {
        const trimmedDescription =
          goal.description && goal.description.length > 200
            ? `${goal.description.slice(0, 197)}…`
            : goal.description;

        const base = `- ${goal.title} (status: ${goal.status})`;
        lines.push(trimmedDescription ? `${base} – ${trimmedDescription}` : base);
      });
    } else {
      lines.push('No goals are currently attached to this arc.');
    }

    lines.push(''); // spacer between arcs
  });

  return lines.join('\n');
}

/**
 * Helper for building a natural-language snapshot of the user's existing Goals
 * and Activities. This is passed into AgentWorkspace for activity creation so
 * the coach can keep suggestions realistic, non-duplicative, and complementary.
 */
export function buildActivityCoachLaunchContext(
  goals: Goal[],
  activities: Activity[]
): string | undefined {
  if (goals.length === 0 && activities.length === 0) {
    return undefined;
  }

  const lines: string[] = [];

  lines.push(
    'Existing workspace snapshot: the user already has the following goals and activities. Use this to keep proposed activities realistic, non-duplicative, and complementary.'
  );
  lines.push(`Total goals: ${goals.length}. Total activities: ${activities.length}.`);
  lines.push('');

  goals.forEach((goal) => {
    const goalActivities = activities.filter((activity) => activity.goalId === goal.id);

    lines.push(`Goal: ${goal.title} (status: ${goal.status}).`);
    if (goal.description) {
      const trimmedDescription =
        goal.description.length > 200 ? `${goal.description.slice(0, 197)}…` : goal.description;
      lines.push(`Description: ${trimmedDescription}`);
    }

    if (goalActivities.length > 0) {
      lines.push('Activities for this goal:');
      goalActivities.forEach((activity) => {
        const base = `- ${activity.title} (status: ${activity.status})`;
        const notes =
          activity.notes && activity.notes.length > 160
            ? `${activity.notes.slice(0, 157)}…`
            : activity.notes;
        lines.push(notes ? `${base} – ${notes}` : base);
      });
    } else {
      lines.push('No activities are currently attached to this goal.');
    }

    lines.push(''); // spacer between goals
  });

  const unassignedActivities = activities.filter((activity) => !activity.goalId);
  if (unassignedActivities.length > 0) {
    lines.push('Unassigned activities (not linked to a specific goal yet):');
    unassignedActivities.forEach((activity) => {
      const base = `- ${activity.title} (status: ${activity.status})`;
      const notes =
        activity.notes && activity.notes.length > 160
          ? `${activity.notes.slice(0, 157)}…`
          : activity.notes;
      lines.push(notes ? `${base} – ${notes}` : base);
    });
    lines.push('');
  }

  return lines.join('\n');
}


