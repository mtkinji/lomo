import React from 'react';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { UnifiedChatScreen } from './UnifiedChatScreen';
import type { UnifiedChatLaunchContext } from './launchContext';

export type UnifiedChatDrawerProps = {
  visible: boolean;
  onClose: () => void;
  launchContext: UnifiedChatLaunchContext;
  scopeLabel: string;
  source?: string;
  threadId: string | null;
  onThreadIdChange: (threadId: string) => void;
};

export function UnifiedChatDrawer({
  visible,
  onClose,
  launchContext,
  scopeLabel,
  source = 'todos_contextual_drawer',
  threadId,
  onThreadIdChange,
}: UnifiedChatDrawerProps) {
  const [snapIndex, setSnapIndex] = React.useState(0);

  React.useEffect(() => {
    if (visible) setSnapIndex(0);
  }, [visible]);

  const routeParams = React.useMemo(
    () => threadId
      ? { threadId }
      : {
          entry: 'fresh' as const,
          source,
          launchContext,
        },
    [launchContext, source, threadId],
  );

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['60%', '100%']}
      snapIndex={snapIndex}
      onSnapIndexChange={setSnapIndex}
      keyboardAvoidanceEnabled={false}
      dismissable
      dismissOnBackdropPress
      backdropMaxOpacity={0.12}
    >
      <UnifiedChatScreen
        presentation="drawer"
        routeParams={routeParams}
        scopeLabel={scopeLabel}
        onComposerFocusChange={(focused) => {
          if (focused) setSnapIndex(1);
        }}
        onThreadIdChange={onThreadIdChange}
      />
    </BottomDrawer>
  );
}
