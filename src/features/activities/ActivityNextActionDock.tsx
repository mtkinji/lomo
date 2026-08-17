import React from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { ActionDockSplitContent } from '../../ui/ActionDockSplitContent';
import { SplitActionDock } from '../../ui/SplitActionDock';
import type {
  ActivityNextBestAction,
  ActivityNextBestActionId,
} from './nextBestAction';

type ActivityNextActionDockProps = {
  recommendedAction: ActivityNextBestAction;
  menuActions: ActivityNextBestAction[];
  onActionPress: (actionId: ActivityNextBestActionId, source: 'primary' | 'menu') => void;
  disabledActionIds?: Partial<Record<ActivityNextBestActionId, boolean>>;
  targetRef?: React.RefObject<View | null>;
  style?: StyleProp<ViewStyle>;
  onLayout?: ViewProps['onLayout'];
};

type ActivityNextActionInlineContentProps = Pick<
  ActivityNextActionDockProps,
  'recommendedAction' | 'menuActions' | 'onActionPress' | 'disabledActionIds'
>;

export function ActivityNextActionInlineContent({
  recommendedAction,
  menuActions,
  onActionPress,
  disabledActionIds,
}: ActivityNextActionInlineContentProps) {
  return (
    <ActionDockSplitContent
      recommendedAction={recommendedAction}
      menuActions={menuActions}
      onActionPress={onActionPress}
      disabledActionIds={disabledActionIds}
      menuAccessibilityLabel="Show other to-do actions"
      primaryTestID="e2e.activityDetail.nextAction.primary"
      menuTriggerTestID="e2e.activityDetail.nextAction.menuTrigger"
      getMenuTestID={(actionId) => `e2e.activityDetail.nextAction.menu.${actionId}`}
    />
  );
}

export function ActivityNextActionDock({
  recommendedAction,
  menuActions,
  onActionPress,
  disabledActionIds,
  targetRef,
  style,
  onLayout,
}: ActivityNextActionDockProps) {
  return (
    <SplitActionDock
      recommendedAction={recommendedAction}
      menuActions={menuActions}
      onActionPress={onActionPress}
      disabledActionIds={disabledActionIds}
      menuAccessibilityLabel="Show other to-do actions"
      primaryTestID="e2e.activityDetail.nextAction.primary"
      menuTriggerTestID="e2e.activityDetail.nextAction.menuTrigger"
      getMenuTestID={(actionId) => `e2e.activityDetail.nextAction.menu.${actionId}`}
      targetRef={targetRef}
      onLayout={onLayout}
      style={style}
    />
  );
}
