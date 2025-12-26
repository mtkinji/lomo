import type { Goal } from '../domain/types';
import { colors } from '../theme';

export type GoalStatus = Goal['status'];

export const GOAL_STATUS_OPTIONS: readonly GoalStatus[] = [
  'planned',
  'in_progress',
  'completed',
  'archived',
] as const;

export type GoalStatusAppearance = {
  label: string;
  /**
   * Used for text treatments like "Status: In progress" on detail screens.
   */
  textColor: string;
  /**
   * Used for small dot indicators in pickers / inline fields.
   */
  dotColor: string;
  /**
   * Used for badge treatments in list cards / tiles.
   */
  badgeBackgroundColor: string;
  badgeTextColor: string;
};

export function getGoalStatusAppearance(status: GoalStatus): GoalStatusAppearance {
  switch (status) {
    case 'planned':
      return {
        label: 'Planned',
        textColor: colors.muted,
        dotColor: colors.muted,
        badgeBackgroundColor: colors.shellAlt,
        badgeTextColor: colors.textSecondary,
      };
    case 'in_progress':
      return {
        label: 'In progress',
        textColor: colors.quiltBlue600,
        dotColor: colors.quiltBlue400,
        badgeBackgroundColor: colors.quiltBlue100,
        badgeTextColor: colors.quiltBlue700,
      };
    case 'completed':
      return {
        label: 'Completed',
        textColor: colors.success,
        dotColor: colors.success,
        badgeBackgroundColor: colors.pine100,
        badgeTextColor: colors.pine800,
      };
    case 'archived':
      return {
        label: 'Archived',
        textColor: colors.gray600,
        dotColor: colors.gray500,
        badgeBackgroundColor: colors.gray100,
        badgeTextColor: colors.gray700,
      };
    default: {
      // Defensive fallback for unexpected server values.
      const safe = String(status).replace('_', ' ');
      return {
        label: safe.charAt(0).toUpperCase() + safe.slice(1),
        textColor: colors.textSecondary,
        dotColor: colors.muted,
        badgeBackgroundColor: colors.shellAlt,
        badgeTextColor: colors.textSecondary,
      };
    }
  }
}


