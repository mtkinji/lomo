import {
  directTodoCaptureTitle,
  type UnifiedChatRequestPolicy,
} from './requestPolicy';
import type { SemanticRequestRoute } from './semanticRequestRouter';

export const MIN_SEMANTIC_ROUTE_CONFIDENCE = 0.75;

const DETERMINISTIC_LOCK_REASONS = new Set([
  'specialist-or-high-stakes-boundary',
  'native-capability-authorization-required',
  'day-plan-recommendation',
  'bounded-relationship-memory-request',
  'explicit-relationship-memory-mutation',
]);

type PreviousConversationPolicy = Pick<
  UnifiedChatRequestPolicy,
  'requestClass' | 'participatingCapabilities' | 'usePrivateContext'
>;

const CLARIFICATION_PROMPT_PATTERN =
  /\b(tell me|which|what|when|where|how (?:many|much|long)|choose|pick|do you want|would you like)\b/i;
const PROMISED_MUTATION_PATTERN =
  /\b(?:i(?:['’]ll| will)|kwilt (?:will|can))\b[^.!?]{0,100}\b(place|add|schedule|move|update|create|change)\b/i;
const PLAN_PLACEMENT_CLARIFICATION_PATTERN =
  /\b(open windows?|time windows?|block length|placement|start time|schedule|place it)\b/i;
const PLAN_SCHEDULING_PARAMETER_PATTERN =
  /(?:\b\d+(?:\.\d+)?\s*(?:hours?|hrs?|minutes?|mins?)\b|\b(?:morning|afternoon|evening|noon|midday|after|before)\b|\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b)/i;

function conversationFollowUpPolicy({
  prompt,
  deterministicPolicy,
  previousPolicy,
  previousAssistantMessage,
}: {
  prompt: string;
  deterministicPolicy: UnifiedChatRequestPolicy;
  previousPolicy?: PreviousConversationPolicy;
  previousAssistantMessage?: string;
}): UnifiedChatRequestPolicy | null {
  const capabilities = previousPolicy
    ? [...new Set(previousPolicy.participatingCapabilities)]
    : [];
  const suppliesPlanSchedulingParameters =
    capabilities.includes('plan') && PLAN_SCHEDULING_PARAMETER_PATTERN.test(prompt);
  if (
    deterministicPolicy.requestClass !== 'general' ||
    !previousPolicy?.usePrivateContext ||
    capabilities.length === 0 ||
    (!suppliesPlanSchedulingParameters && (
      !previousAssistantMessage || !CLARIFICATION_PROMPT_PATTERN.test(previousAssistantMessage)
    ))
  ) return null;
  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount === 0 || wordCount > 12) return null;
  const completesPromisedMutation =
    suppliesPlanSchedulingParameters ||
    PROMISED_MUTATION_PATTERN.test(previousAssistantMessage ?? '') ||
    (capabilities.includes('plan') && PLAN_PLACEMENT_CLARIFICATION_PATTERN.test(previousAssistantMessage ?? ''));
  return {
    requestClass:
      previousPolicy.requestClass === 'capability_action' || completesPromisedMutation
        ? 'capability_action'
        : 'general_with_kwilt_context',
    participatingCapabilities: capabilities,
    usePrivateContext: true,
    clarification: null,
    policyReason: `conversation-follow-up:${capabilities.join(',')}`,
  };
}

function hasCoherentShape(route: SemanticRequestRoute): boolean {
  const hasCapabilities = route.participatingCapabilities.length > 0;
  switch (route.requestClass) {
    case 'general':
      return !hasCapabilities && !route.usePrivateContext;
    case 'general_with_kwilt_context':
    case 'capability_question':
    case 'capability_action':
      return hasCapabilities && route.usePrivateContext;
    case 'native_control':
      return route.participatingCapabilities.includes('screenTime') && !route.usePrivateContext;
    case 'better_served_elsewhere':
      return !route.usePrivateContext;
    default:
      return false;
  }
}

export function shouldAttemptSemanticRouting({
  prompt,
  deterministicPolicy,
}: {
  prompt: string;
  deterministicPolicy: UnifiedChatRequestPolicy;
}): boolean {
  if (DETERMINISTIC_LOCK_REASONS.has(deterministicPolicy.policyReason)) return false;
  if (
    deterministicPolicy.requestClass === 'capability_action' &&
    deterministicPolicy.participatingCapabilities.length === 1 &&
    deterministicPolicy.participatingCapabilities[0] === 'todos' &&
    directTodoCaptureTitle(prompt)
  ) return false;
  return true;
}

export function resolveHybridRequestPolicy({
  prompt,
  deterministicPolicy,
  semanticRoute,
  previousPolicy,
  previousAssistantMessage,
}: {
  prompt: string;
  deterministicPolicy: UnifiedChatRequestPolicy;
  semanticRoute: SemanticRequestRoute | null;
  previousPolicy?: PreviousConversationPolicy;
  previousAssistantMessage?: string;
}): UnifiedChatRequestPolicy {
  if (!shouldAttemptSemanticRouting({ prompt, deterministicPolicy })) return deterministicPolicy;
  const followUpPolicy = conversationFollowUpPolicy({
    prompt,
    deterministicPolicy,
    previousPolicy,
    previousAssistantMessage,
  });
  if (followUpPolicy) return followUpPolicy;
  if (!semanticRoute || semanticRoute.confidence < MIN_SEMANTIC_ROUTE_CONFIDENCE) {
    return deterministicPolicy;
  }
  if (!hasCoherentShape(semanticRoute)) return deterministicPolicy;

  const reason = semanticRoute.reason.replace(/\s+/g, ' ').trim().slice(0, 180);
  return {
    requestClass: semanticRoute.requestClass,
    participatingCapabilities: [...semanticRoute.participatingCapabilities],
    usePrivateContext: semanticRoute.usePrivateContext,
    clarification: null,
    policyReason: `semantic-route:${reason}`,
  };
}
