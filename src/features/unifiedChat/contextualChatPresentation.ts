import type { UnifiedChatLaunchContext } from './launchContext';
import type { AgentWorkbenchContextRef, AgentWorkbenchOffer } from './workbenchProtocol';

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
  chores: {
    inventory: { title: 'Chat about chores', placeholder: 'Ask about your chore routine' },
    detail: { title: 'Chat about this chore', placeholder: 'Ask about this chore' },
  },
  meal_planning: {
    inventory: { title: 'Plan this week', placeholder: 'What should this plan account for?' },
    detail: { title: 'Chat about this meal plan', placeholder: 'Ask about this meal plan' },
  },
  plan: {
    inventory: { title: 'Chat about Plan', placeholder: 'Ask about your plan' },
    detail: { title: 'Chat about this day', placeholder: 'What should this day account for?' },
  },
  recipes: {
    inventory: { title: 'Chat about recipes', placeholder: 'Ask about these recipes' },
    detail: { title: 'Chat about this meal', placeholder: 'Ask about this meal' },
  },
};

const RECIPE_DETAIL_OFFERS: AgentWorkbenchOffer[] = [
  {
    id: 'recipe-swap',
    title: 'Swap an ingredient',
    cue: 'Keep the recipe working',
    prompt: 'Help me substitute an ingredient in this recipe. Ask which ingredient and what constraint matters before recommending a swap.',
  },
  {
    id: 'recipe-revise',
    title: 'Make it ours',
    cue: 'Shape a personal version',
    prompt: 'Help me create a personal variation of this recipe. Talk through the changes with me and show the revision before anything is saved.',
  },
  {
    id: 'recipe-fit',
    title: 'Fit tonight',
    cue: 'Adjust time or servings',
    prompt: 'Help me adapt this recipe for tonight. Ask about the time, servings, and equipment I have before suggesting changes.',
  },
  {
    id: 'recipe-pantry',
    title: 'Use what we have',
    cue: 'Work from the kitchen',
    prompt: 'Help me make this recipe with what we have. Ask what is already in the kitchen, then separate workable swaps from what we still need.',
  },
];

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

export function getFreshDrawerOffers(
  launchContext: UnifiedChatLaunchContext | null | undefined,
): AgentWorkbenchOffer[] {
  return launchContext?.capabilityId === 'recipes' && launchContext.surface === 'detail'
    ? RECIPE_DETAIL_OFFERS
    : [];
}
