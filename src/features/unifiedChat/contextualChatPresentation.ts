import type { UnifiedChatLaunchContext } from './launchContext';
import type { AgentWorkbenchContextRef } from './workbenchProtocol';

const FRESH_LAUNCH_CONTEXT_ID = 'fresh-launch-context';

const DRAWER_COPY: Record<
  UnifiedChatLaunchContext['capabilityId'],
  Record<UnifiedChatLaunchContext['surface'], { title: string; placeholder: string }>
> = {
  todos: {
    inventory: { title: 'Chat about to-dos', placeholder: 'Ask about these to-dos' },
    detail: { title: 'Chat about this to-do', placeholder: 'Ask about this to-do' },
  },
  goals: {
    inventory: { title: 'Chat about goals', placeholder: 'Ask about these goals' },
    detail: { title: 'Chat about this goal', placeholder: 'Ask about this goal' },
  },
  chapters: {
    inventory: { title: 'Chat about chapters', placeholder: 'Ask about these chapters' },
    detail: { title: 'Chat about this chapter', placeholder: 'Ask about this chapter' },
  },
  meal_planning: {
    inventory: { title: 'Plan this week', placeholder: 'What should this plan account for?' },
    detail: { title: 'Chat about this meal plan', placeholder: 'Ask about this meal plan' },
  },
};

export function buildFreshDrawerContext(
  launchContext: UnifiedChatLaunchContext | null | undefined,
  scopeLabel?: string,
): AgentWorkbenchContextRef[] {
  if (!launchContext) return [];
  return [{
    id: FRESH_LAUNCH_CONTEXT_ID,
    capabilityId: launchContext.capabilityId,
    object: {
      id: launchContext.object?.id ?? launchContext.capabilityId,
      type: launchContext.object?.type ?? 'capability',
      label: scopeLabel ?? (launchContext.capabilityId === 'todos' ? 'To-dos' : launchContext.capabilityId),
    },
    source: 'launch',
    removable: true,
    version: 1,
  }];
}

export function getFreshDrawerCopy(launchContext: UnifiedChatLaunchContext | null | undefined) {
  return launchContext ? DRAWER_COPY[launchContext.capabilityId][launchContext.surface] : null;
}
