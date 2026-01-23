import type { Arc, Goal, Activity } from '../../domain/types';
import { richTextToPlainText } from '../../ui/richText';

const MAX_WORKSPACE_SNAPSHOT_CHARS = 8000;
const SNAPSHOT_TRUNCATION_NOTICE = '\n\n[Workspace snapshot truncated for length limits.]';

function clampWorkspaceSnapshot(raw?: string): string | undefined {
  if (!raw) return undefined;
  const text = raw.trim();
  if (!text) return undefined;
  if (text.length <= MAX_WORKSPACE_SNAPSHOT_CHARS) return text;

  // Preserve the most important content first (we build focused sections near the top),
  // while preventing oversized AI requests that can fail transport/model limits.
  const maxPrefix =
    MAX_WORKSPACE_SNAPSHOT_CHARS - SNAPSHOT_TRUNCATION_NOTICE.length - 1; // reserve room for ellipsis + notice
  if (maxPrefix <= 0) {
    return `${text.slice(0, Math.max(0, MAX_WORKSPACE_SNAPSHOT_CHARS - 1))}…`;
  }
  return `${text.slice(0, maxPrefix).trimEnd()}…${SNAPSHOT_TRUNCATION_NOTICE}`;
}

/**
 * Shared helper for building a natural-language snapshot of the user's
 * existing Arcs and Goals. This is passed into AgentWorkspace as a hidden
 * context string so the Arc / Goal coach surfaces can propose complementary
 * Arcs or Goals.
 */
export function buildArcCoachLaunchContext(
  arcs: Arc[],
  goals: Goal[],
  focusArcId?: string,
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

  const focusArc =
    focusArcId ? arcs.find((candidate) => candidate.id === focusArcId) ?? null : null;
  if (focusArc) {
    lines.push(
      'FOCUSED ARC (this is the arc you must anchor goal recommendations to):',
      `- ${focusArc.name} (status: ${focusArc.status}, id: ${focusArc.id})`,
    );
    if (focusArc.narrative) {
      lines.push(`Narrative: ${richTextToPlainText(focusArc.narrative)}`);
    }
    const focusGoals = goals.filter((goal) => goal.arcId === focusArc.id);
    if (focusGoals.length > 0) {
      lines.push('Existing goals in this arc (avoid duplicates):');
      focusGoals.slice(0, 8).forEach((goal) => {
        lines.push(`- ${goal.title} (status: ${goal.status})`);
      });
      if (focusGoals.length > 8) {
        lines.push(`…and ${focusGoals.length - 8} more.`);
      }
    } else {
      lines.push('No goals are currently attached to the focused arc.');
    }
    lines.push(''); // spacer after focused arc
  }

  arcs.forEach((arc) => {
    // When we include a focused arc section above, keep the full list below for
    // general context, but avoid duplicating the exact same arc header twice.
    if (focusArc && arc.id === focusArc.id) {
      return;
    }
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

  const unassignedGoals = goals.filter((g) => !g.arcId);
  if (unassignedGoals.length > 0) {
    lines.push('Unassigned goals (not yet attached to an Arc):');
    unassignedGoals.slice(0, 10).forEach((goal) => {
      const descriptionPlain = goal.description ? richTextToPlainText(goal.description) : '';
      const trimmedDescription =
        descriptionPlain && descriptionPlain.length > 200 ? `${descriptionPlain.slice(0, 197)}…` : descriptionPlain;
      const base = `- ${goal.title} (status: ${goal.status})`;
      lines.push(trimmedDescription ? `${base} – ${trimmedDescription}` : base);
    });
    if (unassignedGoals.length > 10) {
      lines.push(`…and ${unassignedGoals.length - 10} more.`);
    }
    lines.push('');
  }

  return clampWorkspaceSnapshot(lines.join('\n'));
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
  focusActivityId?: string,
  activityTagHistory?: Record<
    string,
    {
      tag: string;
      lastUsedAt: string;
      totalUses: number;
      recentUses: Array<{ activityTitle: string; activityType: string; usedAt: string }>;
    }
  >
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

  // User tag vocabulary: reuse before inventing new ones.
  const tagHistoryEntries = activityTagHistory ? Object.values(activityTagHistory) : [];
  if (tagHistoryEntries.length > 0) {
    const ordered = tagHistoryEntries
      .slice()
      .sort((a, b) => {
        const aT = Date.parse(a.lastUsedAt);
        const bT = Date.parse(b.lastUsedAt);
        if (Number.isFinite(aT) && Number.isFinite(bT)) return bT - aT;
        if (Number.isFinite(aT)) return -1;
        if (Number.isFinite(bT)) return 1;
        return (b.totalUses ?? 0) - (a.totalUses ?? 0);
      })
      .slice(0, 24);

    lines.push('TAG HISTORY (the user’s existing tag vocabulary; reuse these before creating new tags):');
    ordered.forEach((entry) => {
      const examples = (entry.recentUses ?? [])
        .slice(0, 2)
        .map((u) => `${u.activityTitle} [${u.activityType}]`)
        .join('; ');
      lines.push(`- ${entry.tag} (uses: ${entry.totalUses}${examples ? `; examples: ${examples}` : ''})`);
    });
    lines.push(
      'Guideline: when asked to suggest/add tags, first pick from TAG HISTORY that fit the context. Only invent new tags if none of the existing tags match.'
    );
    lines.push('');
  }

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

  return clampWorkspaceSnapshot(lines.join('\n'));
}


