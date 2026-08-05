import {
  directTodoCaptureTitle,
  type UnifiedChatRequestPolicy,
} from './requestPolicy';
import type { SemanticRequestRoute } from './semanticRequestRouter';
import { classifyTurnReference, type UnifiedChatTurnContract } from './turnContract';

export const MIN_SEMANTIC_ROUTE_CONFIDENCE = 0.75;

const DETERMINISTIC_LOCK_REASONS = new Set([
  'specialist-or-high-stakes-boundary',
  'native-capability-authorization-required',
  'day-plan-recommendation',
  'day-plan-status',
  'bounded-relationship-memory-request',
  'explicit-relationship-memory-mutation',
  'unsupported-consequential-effect',
  'ambiguous-action-target',
]);

export function shouldAttemptAgentJudgment(
  deterministicPolicy: UnifiedChatRequestPolicy,
): boolean {
  return !DETERMINISTIC_LOCK_REASONS.has(deterministicPolicy.policyReason);
}

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
const REFERENTIAL_ACTION_CORRECTION_PATTERN =
  /(?:\bclose,?\s+but\b|\btry\s+(?:that|it)\s+again\b|\binstead\s+of\b|\b(?:move|put)\b[^.!?]{0,80}\b(?:front|beginning|end)\b)/i;

function conversationFollowUpPolicy({
  prompt,
  deterministicPolicy,
  previousPolicy,
  previousAssistantMessage,
  previousTurnContract,
}: {
  prompt: string;
  deterministicPolicy: UnifiedChatRequestPolicy;
  previousPolicy?: PreviousConversationPolicy;
  previousAssistantMessage?: string;
  previousTurnContract?: UnifiedChatTurnContract;
}): UnifiedChatRequestPolicy | null {
  const typedReference = classifyTurnReference(prompt);
  if (
    typedReference &&
    previousTurnContract?.requestClass === 'capability_action' &&
    previousTurnContract.action &&
    previousTurnContract.participatingCapabilities.length > 0
  ) {
    return {
      requestClass: 'capability_action',
      participatingCapabilities: [...previousTurnContract.participatingCapabilities],
      usePrivateContext: previousTurnContract.usePrivateContext,
      clarification: null,
      policyReason: `conversation-follow-up:${previousTurnContract.participatingCapabilities.join(',')}`,
    };
  }
  const capabilities = previousPolicy
    ? [...new Set(previousPolicy.participatingCapabilities)]
    : [];
  const correctsPreviousAction =
    previousPolicy?.requestClass === 'capability_action' &&
    REFERENTIAL_ACTION_CORRECTION_PATTERN.test(prompt);
  const suppliesPlanSchedulingParameters =
    capabilities.includes('plan') && PLAN_SCHEDULING_PARAMETER_PATTERN.test(prompt);
  if (
    (deterministicPolicy.requestClass !== 'general' && !correctsPreviousAction) ||
    !previousPolicy?.usePrivateContext ||
    capabilities.length === 0 ||
    (!correctsPreviousAction && !suppliesPlanSchedulingParameters && (
      !previousAssistantMessage || !CLARIFICATION_PROMPT_PATTERN.test(previousAssistantMessage)
    ))
  ) return null;
  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount === 0 || wordCount > (correctsPreviousAction ? 30 : 12)) return null;
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
  allowAdditionalCapabilities = false,
  previousPolicy,
  previousAssistantMessage,
  previousTurnContract,
}: {
  prompt: string;
  deterministicPolicy: UnifiedChatRequestPolicy;
  semanticRoute: SemanticRequestRoute | null;
  allowAdditionalCapabilities?: boolean;
  previousPolicy?: PreviousConversationPolicy;
  previousAssistantMessage?: string;
  previousTurnContract?: UnifiedChatTurnContract;
}): UnifiedChatRequestPolicy {
  if (!shouldAttemptSemanticRouting({ prompt, deterministicPolicy })) return deterministicPolicy;
  const followUpPolicy = conversationFollowUpPolicy({
    prompt,
    deterministicPolicy,
    previousPolicy,
    previousAssistantMessage,
    previousTurnContract,
  });
  if (followUpPolicy) return followUpPolicy;
  if (!semanticRoute || semanticRoute.confidence < MIN_SEMANTIC_ROUTE_CONFIDENCE) {
    return deterministicPolicy;
  }
  if (
    deterministicPolicy.requestClass === 'capability_question' &&
    semanticRoute.requestClass === 'general_with_kwilt_context'
  ) {
    return deterministicPolicy;
  }
  if (
    deterministicPolicy.requestClass === 'capability_question' &&
    semanticRoute.requestClass === 'capability_action' &&
    (DETERMINISTIC_LOCK_REASONS.has(deterministicPolicy.policyReason) ||
      (deterministicPolicy.participatingCapabilities.length === 1 &&
        deterministicPolicy.participatingCapabilities[0] === 'plan'))
  ) {
    return deterministicPolicy;
  }
  if (!hasCoherentShape(semanticRoute)) return deterministicPolicy;
  if (deterministicPolicy.requestClass === 'general' && semanticRoute.requestClass === 'better_served_elsewhere') {
    return deterministicPolicy;
  }
  if (
    deterministicPolicy.participatingCapabilities.some(
      (capability) => !semanticRoute.participatingCapabilities.includes(capability),
    )
  ) {
    return deterministicPolicy;
  }
  if (
    deterministicPolicy.requestClass === 'capability_action' &&
    deterministicPolicy.participatingCapabilities.length > 0 &&
    (
      semanticRoute.requestClass !== 'capability_action' ||
      (!allowAdditionalCapabilities && semanticRoute.participatingCapabilities.some(
        (capability) => !deterministicPolicy.participatingCapabilities.includes(capability),
      ))
    )
  ) {
    return deterministicPolicy;
  }

  const reason = semanticRoute.reason.replace(/\s+/g, ' ').trim().slice(0, 180);
  return {
    requestClass: semanticRoute.requestClass,
    participatingCapabilities: [...semanticRoute.participatingCapabilities],
    usePrivateContext: semanticRoute.usePrivateContext,
    clarification: null,
    policyReason: `semantic-route:${reason}`,
  };
}
