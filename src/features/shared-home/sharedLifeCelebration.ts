import { useCelebrationStore } from '../../store/useCelebrationStore';
import { useAppStore } from '../../store/useAppStore';
import { useHouseholdModeStore } from '../household/sharedDevice/useHouseholdModeStore';
import { shareMomentInHome } from './sharedLifeShareRequest';
import type { HomeAttachment } from './sharedLifeTypes';

/** One completion surface, followed by the ordinary reviewed Home composer. */
export function offerHomeMoment(
  userId: string,
  attachment: HomeAttachment,
  sourceEventId: string,
) {
  const ownsMoment = () =>
    useAppStore.getState().authIdentity?.userId === userId &&
    !useHouseholdModeStore.getState().session;
  if (!ownsMoment()) return false;
  const goal = attachment.kind === 'goal_completed';
  const title =
    attachment.kind === 'place' ? attachment.name : attachment.title;
  useCelebrationStore.getState().celebrate({
    id: `home-moment:${userId}:${sourceEventId}`,
    ownerUserId: userId,
    kind: goal ? 'goalCompleted' : 'milestone',
    headline: goal ? 'You completed a goal!' : 'A new place to remember',
    subheadline: title,
    priority: 'high',
    autoDismissMs: 0,
    primaryAction: {
      label: 'Share this moment',
      run: () => {
        if (ownsMoment()) shareMomentInHome(userId, attachment);
      },
    },
  });
  return true;
}
