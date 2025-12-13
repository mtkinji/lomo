import type { Arc, Goal, Activity } from '../../domain/types';

/**
 * Shared helper for building a natural-language snapshot of the user's
 * existing Arcs and Goals. This is passed into AgentWorkspace as a hidden
 * context string so the Arc / Goals AI surfaces can propose complementary
 * Arcs or Goals.
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
 * Activities AI can keep suggestions realistic, non-duplicative, and complementary.
 */
export function buildActivityCoachLaunchContext(
  goals: Goal[],
  activities: Activity[],
  focusGoalId?: string,
  arcs?: Arc[]
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

  const focusGoal =
    focusGoalId ? goals.find((candidate) => candidate.id === focusGoalId) ?? null : null;
  const orderedGoals = focusGoal
    ? [focusGoal, ...goals.filter((g) => g.id !== focusGoal.id)]
    : goals;

  if (focusGoal) {
    const focusArc =
      arcs && focusGoal.arcId ? arcs.find((candidate) => candidate.id === focusGoal.arcId) ?? null : null;

    lines.push(
      'FOCUSED GOAL (this is the goal you must anchor recommendations to):',
      `- ${focusGoal.title} (status: ${focusGoal.status}, id: ${focusGoal.id})`
    );
    if (focusGoal.description) {
      const trimmedDescription =
        focusGoal.description.length > 280
          ? `${focusGoal.description.slice(0, 277)}…`
          : focusGoal.description;
      lines.push(`Description: ${trimmedDescription}`);
    }

    const focusActivities = activities.filter((activity) => activity.goalId === focusGoal.id);
    if (focusActivities.length > 0) {
      lines.push('Existing activities for the focused goal (avoid duplicates):');
      focusActivities.forEach((activity) => {
        lines.push(`- ${activity.title} (status: ${activity.status})`);
      });
    } else {
      lines.push('No activities are currently attached to the focused goal.');
    }

    if (focusArc) {
      lines.push('');
      lines.push(
        'FOCUSED ARC (this goal belongs to this arc; keep activities aligned to its storyline):',
        `- ${focusArc.name} (status: ${focusArc.status}, id: ${focusArc.id})`
      );
      if (focusArc.narrative) {
        const trimmedNarrative =
          focusArc.narrative.length > 360 ? `${focusArc.narrative.slice(0, 357)}…` : focusArc.narrative;
        lines.push(`Narrative: ${trimmedNarrative}`);
      }

      const siblingGoals = goals.filter((g) => g.arcId === focusArc.id && g.id !== focusGoal.id);
      if (siblingGoals.length > 0) {
        lines.push('Other goals in this arc (for coordination / avoiding overlap):');
        siblingGoals.slice(0, 6).forEach((g) => {
          lines.push(`- ${g.title} (status: ${g.status})`);
        });
        if (siblingGoals.length > 6) {
          lines.push(`…and ${siblingGoals.length - 6} more.`);
        }
      }
    }

    lines.push(''); // spacer after focused goal
  }

  orderedGoals.forEach((goal) => {
    const goalActivities = activities.filter((activity) => activity.goalId === goal.id);

    const goalLabel = focusGoal && goal.id === focusGoal.id ? 'Goal (focused):' : 'Goal:';
    lines.push(`${goalLabel} ${goal.title} (status: ${goal.status}).`);
    if (goal.description) {
      const trimmedDescription =
        goal.description.length > 200 ? `${goal.description.slice(0, 197)}…` : goal.description;
      lines.push(`Description: ${trimmedDescription}`);
    }

    if (goalActivities.length > 0) {
      // For non-focused goals, keep this compact; the focused goal has a full
      // section above that the agent should prioritise.
      const shouldCompact = Boolean(focusGoal) && goal.id !== focusGoal?.id;
      const shown = shouldCompact ? goalActivities.slice(0, 4) : goalActivities;
      lines.push(shouldCompact ? 'Activities for this goal (sample):' : 'Activities for this goal:');
      shown.forEach((activity) => {
        const base = `- ${activity.title} (status: ${activity.status})`;
        const notes =
          activity.notes && activity.notes.length > 160
            ? `${activity.notes.slice(0, 157)}…`
            : activity.notes;
        lines.push(notes ? `${base} – ${notes}` : base);
      });
      if (shouldCompact && goalActivities.length > shown.length) {
        lines.push(`…and ${goalActivities.length - shown.length} more.`);
      }
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


