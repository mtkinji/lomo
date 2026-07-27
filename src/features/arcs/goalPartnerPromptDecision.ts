import type { PartnerPromptTrigger } from '../../store/useCheckinNudgeStore';

type GoalPartnerPromptDecisionInput = {
  goalId: string;
  isFocused: boolean;
  isSharedGoal: boolean;
  sharingRemindersMuted: boolean;
  showFirstGoalCelebration: boolean;
  shareDrawerVisible: boolean;
  membersSheetVisible: boolean;
  todoCount: number;
  completedCount: number;
  isMomentAllowed: () => boolean;
  shouldShowPrompt: (trigger: PartnerPromptTrigger) => boolean;
};

export function selectGoalPartnerPromptTrigger({
  goalId,
  isFocused,
  isSharedGoal,
  sharingRemindersMuted,
  showFirstGoalCelebration,
  shareDrawerVisible,
  membersSheetVisible,
  todoCount,
  completedCount,
  isMomentAllowed,
  shouldShowPrompt,
}: GoalPartnerPromptDecisionInput): PartnerPromptTrigger | null {
  if (!isFocused || !goalId || isSharedGoal || sharingRemindersMuted) return null;
  if (showFirstGoalCelebration || shareDrawerVisible || membersSheetVisible) return null;
  if (todoCount <= 0 || !isMomentAllowed()) return null;

  const candidates: PartnerPromptTrigger[] = [];
  if (completedCount > 0) candidates.push('first_progress_alone');
  candidates.push('first_todo_added');

  return candidates.find((candidate) => shouldShowPrompt(candidate)) ?? null;
}
