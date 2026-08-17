import React from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { ActionDock, type ActionDockItem } from './ActionDock';
import {
  ActionDockSplitContent,
  type ActionDockSplitAction,
} from './ActionDockSplitContent';

type Props<Id extends string> = {
  recommendedAction: ActionDockSplitAction<Id>;
  menuActions: ActionDockSplitAction<Id>[];
  onActionPress: (actionId: Id, source: 'primary' | 'menu') => void;
  disabledActionIds?: Partial<Record<Id, boolean>>;
  menuAccessibilityLabel: string;
  primaryTestID?: string;
  menuTriggerTestID?: string;
  getMenuTestID?: (actionId: Id) => string | undefined;
  targetRef?: React.RefObject<View | null>;
  rightItem?: ActionDockItem;
  style?: StyleProp<ViewStyle>;
  onLayout?: ViewProps['onLayout'];
};

export function SplitActionDock<Id extends string>({
  recommendedAction,
  menuActions,
  onActionPress,
  disabledActionIds,
  menuAccessibilityLabel,
  primaryTestID,
  menuTriggerTestID,
  getMenuTestID,
  targetRef,
  rightItem,
  style,
  onLayout,
}: Props<Id>) {
  return (
    <ActionDock
      leftDockTargetRef={targetRef}
      rightItem={rightItem}
      leftContent={(
        <ActionDockSplitContent
          recommendedAction={recommendedAction}
          menuActions={menuActions}
          onActionPress={onActionPress}
          disabledActionIds={disabledActionIds}
          menuAccessibilityLabel={menuAccessibilityLabel}
          primaryTestID={primaryTestID}
          menuTriggerTestID={menuTriggerTestID}
          getMenuTestID={getMenuTestID}
        />
      )}
      onLayout={onLayout}
      style={style}
    />
  );
}
