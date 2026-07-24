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
  profile: 'Read the user\'s bounded coaching profile and update an explicitly requested display name or age range.',
  relationships: 'Read explicitly saved People, facts, dates, and follow-up cadences; remember, correct, or forget only details the user explicitly identifies.',
  screenTime: 'Recognize Screen Time and app-control requests that require native authorization.',
  notifications: 'Open native notification settings and authorization owned by the device.',
  account: 'Read show-up streak status or open native account, subscription, and destructive account-review surfaces; never silently execute consequential changes.',
  navigation: 'Open an exact native Kwilt destination such as search.',
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
      },
    );
    return parseSemanticRequestRoute(response);
  } catch {
    return null;
  }
}
