import type { Activity } from '../../domain/types';
import type { IconName } from '../../ui/Icon';

export type ActivityNextBestActionId =
  | 'startFocusSprint'
  | 'scheduleTime'
  | 'breakIntoSteps'
  | 'askKwilt'
  | 'share';

export type ActivityNextBestAction = {
  id: ActivityNextBestActionId;
  label: string;
  icon: IconName;
  accessibilityLabel: string;
};

export const ACTIVITY_NEXT_BEST_ACTIONS: Record<ActivityNextBestActionId, ActivityNextBestAction> = {
  startFocusSprint: {
    id: 'startFocusSprint',
    label: 'Focus',
    icon: 'focus',
    accessibilityLabel: 'Start focus sprint',
  },
  scheduleTime: {
    id: 'scheduleTime',
    label: 'Schedule',
    icon: 'sendToCalendar',
    accessibilityLabel: 'Schedule time',
  },
  breakIntoSteps: {
    id: 'breakIntoSteps',
    label: 'Add steps',
    icon: 'checklist',
    accessibilityLabel: 'Break into steps',
  },
  askKwilt: {
    id: 'askKwilt',
    label: 'Ask Kwilt',
    icon: 'sparkles',
    accessibilityLabel: 'Ask Kwilt',
  },
  share: {
    id: 'share',
    label: 'Share',
    icon: 'share',
    accessibilityLabel: 'Share this to-do',
  },
};

export const ACTIVITY_NEXT_BEST_ACTION_MENU_ORDER: ActivityNextBestActionId[] = [
  'startFocusSprint',
  'scheduleTime',
  'breakIntoSteps',
  'askKwilt',
  'share',
];

export function getNextBestActivityAction(params: {
  activity: Activity;
  now?: Date;
}): ActivityNextBestAction {
  return ACTIVITY_NEXT_BEST_ACTIONS.startFocusSprint;
}
