import type { Arc, Goal, Activity } from '../../domain/types';
import { richTextToPlainText } from '../../ui/richText';

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
      lines.push(`Narrative: ${richTextToPlainText(arc.narrative)}`);
    }

    if (arcGoals.length > 0) {
      lines.push('Goals in this arc:');
      arcGoals.forEach((goal) => {
        const descriptionPlain = goal.description ? richTextToPlainText(goal.description) : '';
        const trimmedDescription =
          descriptionPlain && descriptionPlain.length > 200 ? `${descriptionPlain.slice(0, 197)}…` : descriptionPlain;

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
  arcs?: Arc[],
  focusActivityId?: string
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

  const focusActivity =
    focusActivityId
      ? activities.find((candidate) => candidate.id === focusActivityId) ?? null
      : null;

  if (focusActivity) {
    lines.push(
      'FOCUSED ACTIVITY (this is what the user is viewing; base your guidance on it):',
      `- ${focusActivity.title} (status: ${focusActivity.status}, id: ${focusActivity.id})`
    );

    if (typeof focusActivity.estimateMinutes === 'number' && focusActivity.estimateMinutes > 0) {
      lines.push(`Estimate (minutes): ${focusActivity.estimateMinutes}`);
    }

    if (focusActivity.difficulty) {
      lines.push(`Difficulty: ${focusActivity.difficulty}`);
    }

    if (focusActivity.scheduledDate) {
      lines.push(`Scheduled date: ${focusActivity.scheduledDate}`);
    }

    if (focusActivity.scheduledAt) {
      lines.push(`Scheduled at: ${focusActivity.scheduledAt}`);
    }

    if (focusActivity.reminderAt) {
      lines.push(`Reminder at: ${focusActivity.reminderAt}`);
    }

    if (Array.isArray(focusActivity.tags) && focusActivity.tags.length > 0) {
      lines.push(`Tags: ${focusActivity.tags.slice(0, 8).join(', ')}`);
    }

    if (focusActivity.notes) {
      const notesPlain = richTextToPlainText(focusActivity.notes);
      const trimmedNotes = notesPlain.length > 520 ? `${notesPlain.slice(0, 517)}…` : notesPlain;
      lines.push(`Notes: ${trimmedNotes}`);
    }

    const steps = Array.isArray(focusActivity.steps) ? focusActivity.steps : [];
    if (steps.length > 0) {
      lines.push('Steps:');
      steps.slice(0, 12).forEach((step) => {
        const status = step.completedAt ? 'done' : 'todo';
        const optional = step.isOptional ? ' (optional)' : '';
        lines.push(`- [${status}] ${step.title}${optional}`);
      });
      if (steps.length > 12) {
        lines.push(`…and ${steps.length - 12} more.`);
      }
    } else {
      lines.push('No steps are currently attached to this activity.');
    }

    lines.push(''); // spacer after focused activity
  }

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
        const narrativePlain = richTextToPlainText(focusArc.narrative);
        const trimmedNarrative =
          narrativePlain.length > 360 ? `${narrativePlain.slice(0, 357)}…` : narrativePlain;
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
      const descriptionPlain = richTextToPlainText(goal.description);
      const trimmedDescription =
        descriptionPlain.length > 200 ? `${descriptionPlain.slice(0, 197)}…` : descriptionPlain;
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
        const notesPlain = activity.notes ? richTextToPlainText(activity.notes) : '';
        const notes = notesPlain.length > 160 ? `${notesPlain.slice(0, 157)}…` : notesPlain;
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
      const notesPlain = activity.notes ? richTextToPlainText(activity.notes) : '';
      const notes = notesPlain.length > 160 ? `${notesPlain.slice(0, 157)}…` : notesPlain;
      lines.push(notes ? `${base} – ${notes}` : base);
    });
    lines.push('');
  }

  return lines.join('\n');
}


