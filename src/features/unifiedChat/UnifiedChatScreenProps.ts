import type { UnifiedChatRouteParams } from './launchContext';

export type UnifiedChatScreenProps = {
  presentation?: 'screen' | 'drawer';
  routeParams?: UnifiedChatRouteParams;
  scopeLabel?: string;
  collapseRequestId?: number;
  onComposerFocusChange?: (focused: boolean) => void;
  onThreadIdChange?: (threadId: string) => void;
};
