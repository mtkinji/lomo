import {
  sendCoachChat as defaultSendCoachChat,
  type CoachChatTurn,
} from '../../services/ai';
import type { UnifiedChatCapabilityId } from './requestPolicy';
import {
  buildSemanticRequestRouterPrompt,
  parseSemanticRequestRoute,
  SEMANTIC_REQUEST_ROUTE_RESPONSE_FORMAT,
  type SemanticRequestRoute,
  type SemanticRouterVisibleContext,
} from './semanticRequestRouter';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';

type SendCoachChat = typeof defaultSendCoachChat;

const CAPABILITY_DESCRIPTIONS: Readonly<Record<UnifiedChatCapabilityId, string>> = {
  arcs: 'Read the user\'s identity-oriented Arcs and the ways those identities show up.',
  goals: 'Read, draft, create, and update the user\'s Goals.',
  todos: 'Read, capture, schedule, and update Activities and To-dos.',
  plan: 'Review and shape a feasible day using Activities, Goals, availability, and calendar constraints.',
  chapters: 'Read and reflect on the user\'s saved Chapters, experiments, and learning.',
  chores: 'Discuss household chore routines. Chore inventory is not yet readable or actionable in Chat.',
  profile: 'Read the user\'s bounded coaching profile and update an explicitly requested display name or age range.',
  relationships: 'Read explicitly saved People, facts, dates, and follow-up cadences; remember, correct, or forget only details the user explicitly identifies.',
  money: 'Read the current Budget answer, including whether the plan fits the chosen income or living limit, plus current-month spending aggregates. Merchant, account, and mutation workflows remain native and bounded.',
  screenTime: 'Recognize Screen Time and app-control requests that require native authorization.',
  notifications: 'Open native notification settings and authorization owned by the device.',
  account: 'Read show-up streak status or open native account, subscription, and destructive account-review surfaces; never silently execute consequential changes.',
  navigation: 'Open an exact native Kwilt destination such as search.',
  recipes: 'Find and discuss the user\'s authorized Recipes and meal ideas.',
  meal_planning: 'Prepare a household-aware Meal Plan using explicit preferences, budget boundaries, and available food evidence.',
};

const capabilityDescriptions = (Object.keys(CAPABILITY_DESCRIPTIONS) as UnifiedChatCapabilityId[])
  .map((capabilityId) => {
    const livePurposes = UNIFIED_CHAT_TOOL_CATALOG
      .filter((tool) => tool.capabilityId === capabilityId)
      .map((tool) => tool.purpose);
    return {
      capabilityId,
      description: [CAPABILITY_DESCRIPTIONS[capabilityId], ...livePurposes].join(' '),
    };
  });

export type RouteUnifiedChatRequestInput = {
  prompt: string;
  visibleContext: readonly SemanticRouterVisibleContext[];
  recentTurns: readonly CoachChatTurn[];
  signal?: AbortSignal;
};

export async function routeUnifiedChatRequest(
  input: RouteUnifiedChatRequestInput,
  dependencies?: { sendCoachChat: SendCoachChat },
): Promise<SemanticRequestRoute | null> {
  const sendCoachChat = dependencies?.sendCoachChat ?? defaultSendCoachChat;
  const launchContextSummary = buildSemanticRequestRouterPrompt({
    ...input,
    capabilityDescriptions,
  });

  try {
    const response = await sendCoachChat(
      [{ role: 'user', content: input.prompt }],
      {
        aiJob: 'lightweight_helper',
        creditPolicy: 'internal_helper',
        includeUserProfileContext: false,
        responseFormat: { ...SEMANTIC_REQUEST_ROUTE_RESPONSE_FORMAT },
        launchContextSummary,
        paywallSource: 'unknown',
        signal: input.signal,
      },
    );
    return parseSemanticRequestRoute(response);
  } catch {
    return null;
  }
}
