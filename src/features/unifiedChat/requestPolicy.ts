import { directScreenTimeControl } from './directAppControl';

export type UnifiedChatRequestClass =
  | 'general'
  | 'general_with_kwilt_context'
  | 'capability_question'
  | 'capability_action'
  | 'native_control'
  | 'better_served_elsewhere';

export const UNIFIED_CHAT_CAPABILITY_IDS = [
  'arcs', 'goals', 'todos', 'plan', 'chapters', 'profile', 'relationships',
  'household', 'money', 'screenTime', 'notifications', 'account', 'navigation', 'recipes', 'meal_planning',
  'chores', 'groceries',
] as const;
export type UnifiedChatCapabilityId = typeof UNIFIED_CHAT_CAPABILITY_IDS[number];

export function isUnifiedChatCapabilityId(value: unknown): value is UnifiedChatCapabilityId {
  return typeof value === 'string' && (UNIFIED_CHAT_CAPABILITY_IDS as readonly string[]).includes(value);
}

export type UnifiedChatContextCandidate = {
  capabilityId: UnifiedChatCapabilityId;
  objectType: string;
  objectId: string;
};

export type UnifiedChatRequestPolicy = {
  requestClass: UnifiedChatRequestClass;
  participatingCapabilities: UnifiedChatCapabilityId[];
  usePrivateContext: boolean;
  clarification: string | null;
  policyReason: string;
};

const HIGH_STAKES_PATTERN =
  /\b(diagnos(?:e|is)|chest pain|medical emergency|suicid|hurt myself|self[- ]?harm|legal advice|legal strategy|court order|attorney|tax filing advice|invest (?:my|our)|retirement savings|immediate danger)\b/i;
const UNSUPPORTED_CONSEQUENTIAL_EFFECT_PATTERN =
  /\b(transfer|wire|send)\b[^.!?]*\b(?:\$|money|funds?|checking|savings|bank)|\bfile\b[^.!?]*\btaxes\b|\badd\b[^.!?]*\b(?:bank account|credit card)\b/i;
const NATIVE_CONTROL_PATTERN =
  /\b(screen time|app limit|block games?|block apps?|allow games?|unlock games?|shield apps?)\b|\bunlock\b[^.!?\n]{0,60}\b(?:apps?|games?)\b/i;
const SELF_MONEY_APP_CONTROL_PATTERN =
  /\b(?:for me|my (?:phone|device)|on this (?:phone|device))\b[\s\S]*\b(?:block|pause|restrict|shield)\b|\b(?:block|pause|restrict|shield)\b[\s\S]*\b(?:apps?|amazon|shopping)\b[\s\S]*\b(?:budget|spend(?:ing|ings)?|over budget|ahead of pace|time of (?:the )?month)\b/i;
const ACTION_PATTERN =
  /\b(move|put|rename|reschedule|schedule|mark|complete|create|add|make|remember|update|change|delete|remove|remind me|call me|turn|enable|disable|open|manage)\b/i;
const AMBIGUOUS_ACTION_TARGET_PATTERN =
  /\b(?:change|move|rename|reschedule|schedule|mark|complete|update|delete|remove|open|manage)\s+(?:it|this|that|these|those)\b/i;
const CONTEXT_REFERENCE_PATTERN =
  /\b(this|that|it|these|those|given|what this week|where i am|current one)\b/i;
const DIRECT_TODO_CAPTURE_PATTERN =
  /^(?:please\s+)?(?:add|create|make|remember|remind me to)\s+\S/i;
const COMPOUND_TODO_CAPTURE_PATTERN =
  /[,;\n]|\b(?:and|then)\s+(?:call|email|text|buy|pick|schedule|book|submit|finish|clean|send|pack|complete|make|create|add|remember|remind)\b/i;
const NON_TODO_DOMAIN_PATTERN =
  /\b(goals?|plans?|chapters?|reflections?|profiles?|screen time|app limits?|money|budget|transaction|payment|transfer|recipes?|meals?|dinners?|groceries)\b/i;
const GENERAL_CONTENT_CREATION_PATTERN =
  /^(?:please\s+)?(?:make\s+me\b|(?:create|make)\s+(?:a|an|the)\s+[^.!?]{0,80}\b(?:story|poem|recipe|packing list|outline|summary|draft)\b)/i;
const DAY_PLAN_RECOMMENDATION_PATTERN =
  /(?:\b(?:what|which)\b[^?]*\b(?:should|could)\b[^?]*\b(?:plan|today|tomorrow)\b|\bcould\b[^?]*\b(?:today|tomorrow)\b[^?]*\b(?:use|fit)\b|\b(?:what|which)\b[^?]*\b(?:focus|prioriti[sz]e)\b[^?]*\b(?:today|tomorrow)\b|\b(?:today|tomorrow)\b[^?]*\bfeel\b[^?]*\b(?:less crowded|lighter|more realistic)\b|\bgiven what (?:this|the) week looks like\b)/i;
const SCHEDULING_ACTION_PATTERN =
  /\b(?:put|move|schedule|reschedule)\b[^.!?]*\b(?:after|before|at|on|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|later|earlier)\b/i;
const SHORT_DAY_FOLLOW_UP_PATTERN =
  /^(?:and\s+)?(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\??$/i;
const DAY_PLAN_STATUS_PATTERN =
  /(?:\b(?:what(?:'s| is)?|show me|do i have)\b[^?]*\b(?:officially|already|actually|scheduled|planned|placed|on)\b[^?]*\b(?:my\s+)?plan\b[^?]*\b(?:today|tomorrow)\b|\b(?:what(?:'s| is)?)\b[^?]*\bon\s+my\s+plan\b[^?]*\b(?:today|tomorrow)\b)/i;
const RELATIONSHIP_MEMORY_QUESTION_PATTERN =
  /\b(?:what|which)\b[^?]*\b(?:remember|know|saved?)\b[^?]*\b(?:about|for)\b/i;
const RELATIONSHIP_MEMORY_MUTATION_PATTERN =
  /(?:\b(?:forget|correct)\b[^.!?]*\b(?:about|birthday|anniversary|likes?|prefers?|allerg|sensitive|follow[ -]?up|check[ -]?in)\b|\b(?:actually,?\s*)?[\p{L}][\p{L}'’-]*(?:'s|’s)\s+(?:birthday|anniversary)\s+(?:is|was|falls?|changed)|\b(?:remember\s+(?:that\s+)?)[\p{L}][\p{L}'’-]+\s+(?:likes?|prefers?|is\s+(?:allergic|sensitive)|has\s+a\s+(?:birthday|deadline)|needs?\s+(?:a\s+)?follow[ -]?up))/iu;
const CURRENT_INFORMATION_PATTERN =
  /(?:\b(?:weather|forecast|news|headlines?|score|standings?|schedule|traffic|price|stock|exchange rate|recall)\b|\b(?:current|currently|latest|today|tonight|tomorrow|right now|still active|near me)\b|\b(?:verify|fact[- ]?check|best reviewed|recommend(?:ed|ation)?s?)\b)/i;

export type UnifiedChatInformationNeed = 'stable' | 'current';

export function classifyCurrentInformationNeed(prompt: string): UnifiedChatInformationNeed {
  return CURRENT_INFORMATION_PATTERN.test(prompt.trim()) ? 'current' : 'stable';
}

function isRelationshipMemoryRequest(prompt: string): boolean {
  return RELATIONSHIP_MEMORY_QUESTION_PATTERN.test(prompt) || RELATIONSHIP_MEMORY_MUTATION_PATTERN.test(prompt);
}

export function directTodoCaptureTitle(prompt: string): string | null {
  if (isRelationshipMemoryRequest(prompt)) return null;
  if (NON_TODO_DOMAIN_PATTERN.test(prompt)) return null;
  if (GENERAL_CONTENT_CREATION_PATTERN.test(prompt.trim())) return null;
  const match = /^(?:please\s+)?(?:add|create|make|remember|remind me to)\s+(.+)$/i.exec(prompt.trim());
  if (!match) return null;
  const title = match[1]
    .replace(/^(?:a|an)\s+/i, '')
    .replace(/^(?:to[ -]?do|task)\s+(?:called\s+)?/i, '')
    .replace(/[.!?]+$/, '')
    .trim();
  if (COMPOUND_TODO_CAPTURE_PATTERN.test(title)) return null;
  return title.length > 0 && title.length <= 240 ? title : null;
}

const COMPOUND_SECOND_ACTION_PATTERN =
  /^(call|email|text|buy|pick up|schedule|book|submit|finish|clean|send|pack|complete|make|create|add|remember)\b\s+.+/i;

function normalizeDirectCaptureTitle(value: string): string | null {
  const title = value
    .replace(/^(?:a|an)\s+/i, '')
    .replace(/^(?:to[ -]?do|task)\s+(?:called\s+)?/i, '')
    .replace(/[.!?]+$/, '')
    .trim();
  if (title.length === 0 || title.length > 240) return null;
  return `${title.charAt(0).toUpperCase()}${title.slice(1)}`;
}

export function directCompoundTodoCaptureTitles(prompt: string): string[] | null {
  const trimmed = prompt.trim();
  if (isRelationshipMemoryRequest(trimmed)) return null;
  if (NON_TODO_DOMAIN_PATTERN.test(trimmed)) return null;
  if (GENERAL_CONTENT_CREATION_PATTERN.test(trimmed)) return null;
  if (/[,;\n]/.test(trimmed)) return null;
  const capture = /^(?:please\s+)?(?:add|create|make|remember|remind me to)\s+(.+)$/i.exec(trimmed);
  if (!capture) return null;
  const parts = /^(.+?)\s+(?:and|then)\s+(.+)$/.exec(capture[1].replace(/[.!?]+$/, '').trim());
  if (!parts || !COMPOUND_SECOND_ACTION_PATTERN.test(parts[2])) return null;
  const first = normalizeDirectCaptureTitle(parts[1]);
  const second = normalizeDirectCaptureTitle(parts[2]);
  return first && second ? [first, second] : null;
}

function uniqueCapabilities(
  values: readonly UnifiedChatCapabilityId[],
): UnifiedChatCapabilityId[] {
  return [...new Set(values)];
}

function explicitCapabilities(prompt: string): UnifiedChatCapabilityId[] {
  const capabilities: UnifiedChatCapabilityId[] = [];
  const personal = /\b(my|our|i have|i've|unfinished)\b/i.test(prompt);
  const action = ACTION_PATTERN.test(prompt.replace(/\bnext move\b/gi, ''));
  const moneyLimitRequest = /\b(?:income|living|spending)\s+limit\b|\b(?:plan|budget)\b[^.!?]{0,40}\b\d{1,3}%\s+(?:income\s+|spending\s+|living\s+)?limit\b/i.test(prompt);
  if (/\b(?:meal plan|plan(?:ning)?\s+(?:our\s+|my\s+)?(?:meals?|dinners?)|dinners?\s+(?:for|this|next)|meals?\s+(?:for|this|next))\b/i.test(prompt)) {
    capabilities.push('meal_planning');
  } else if ((personal || action) && /\b(?:recipes?|ingredients?|cook(?:ing)?)\b/i.test(prompt)) {
    capabilities.push('recipes');
  }
  if ((personal || action) && /\b(arcs?|identit(?:y|ies))\b/i.test(prompt)) capabilities.push('arcs');
  if ((personal || action) && /\bgoals?\b/i.test(prompt)) capabilities.push('goals');
  if (!moneyLimitRequest && (
    /\bmy\s+plans?\b/i.test(prompt) ||
    /\bplans?\s+(?:for\s+)?(?:today|tomorrow)\b/i.test(prompt)
  )) {
    capabilities.push('plan');
  }
  if (/\b(?:goals?|tasks?|to[ -]?dos?)\b[^?]*\b(?:today|tomorrow)\b/i.test(prompt)) {
    capabilities.push('plan');
  }
  if (SCHEDULING_ACTION_PATTERN.test(prompt)) {
    capabilities.push('todos', 'plan');
  }
  if (
    (personal || action) &&
    /\b(to[ -]?dos?|tasks?|activities|activity|errands?|reminders?)\b/i.test(prompt)
  ) {
    capabilities.push('todos');
  }
  if ((personal || action) && /\b(chapters?|reflections?|what i learned|what i tried)\b/i.test(prompt)) {
    capabilities.push('chapters');
  }
  if (moneyLimitRequest || ((personal || action) && /\b(money|budgets?|spend(?:ing|ings)?|transactions?|accounts?)\b/i.test(prompt))) {
    capabilities.push('money');
  }
  if (/\b(my\s+)?profile\b|\b(?:call me|my name is|change my name|age range)\b/i.test(prompt)) {
    capabilities.push('profile');
  }
  if (isRelationshipMemoryRequest(prompt)) capabilities.push('relationships');
  if (
    /\b(?:who is|who's|members? of|in)\s+(?:my|our|the)?\s*household\b|\bhousehold\s+(?:members?|roster|caregivers?|children|child|invitation|invite|access|permissions?|capabilities?)\b|\b(?:invitation|invite)\s+code\b/i.test(prompt)
  ) {
    capabilities.push('household');
  }
  if (/\bremind me\b/i.test(prompt) && !capabilities.includes('todos')) {
    capabilities.push('todos');
  }
  if (/\bnotifications?|notification settings|reminder settings\b/i.test(prompt)) capabilities.push('notifications');
  if (/\b(account settings|subscription|billing|delete my account|close my account)\b/i.test(prompt)) {
    capabilities.push('account');
  }
  if (/\b(search (?:kwilt|the app)|open search)\b/i.test(prompt)) capabilities.push('navigation');
  if (
    capabilities.length === 0 &&
    DIRECT_TODO_CAPTURE_PATTERN.test(prompt) &&
    directTodoCaptureTitle(prompt) &&
    !NON_TODO_DOMAIN_PATTERN.test(prompt)
  ) {
    capabilities.push('todos');
  }
  if (capabilities.length === 0 && COMPOUND_TODO_CAPTURE_PATTERN.test(prompt) && /^(?:please\s+)?(?:add|create|remember|remind me to)\b/i.test(prompt)) {
    capabilities.push('todos');
  }
  const unique = new Set(capabilities);
  return UNIFIED_CHAT_CAPABILITY_IDS.filter((capability) => unique.has(capability));
}

export function classifyUnifiedChatRequest({
  prompt,
  context = [],
}: {
  prompt: string;
  context?: readonly UnifiedChatContextCandidate[];
}): UnifiedChatRequestPolicy {
  const normalizedPrompt = prompt.trim();

  if (HIGH_STAKES_PATTERN.test(normalizedPrompt)) {
    return {
      requestClass: 'better_served_elsewhere',
      participatingCapabilities: [],
      usePrivateContext: false,
      clarification: null,
      policyReason: 'specialist-or-high-stakes-boundary',
    };
  }

  if (UNSUPPORTED_CONSEQUENTIAL_EFFECT_PATTERN.test(normalizedPrompt)) {
    return {
      requestClass: 'better_served_elsewhere',
      participatingCapabilities: [],
      usePrivateContext: false,
      clarification: null,
      policyReason: 'unsupported-consequential-effect',
    };
  }

  if (SELF_MONEY_APP_CONTROL_PATTERN.test(normalizedPrompt) && /\b(?:budget|spend(?:ing|ings)?|over budget|ahead of pace|time of (?:the )?month)\b/i.test(normalizedPrompt)) {
    return {
      requestClass: 'capability_action',
      participatingCapabilities: ['money', 'screenTime'],
      usePrivateContext: true,
      clarification: null,
      policyReason: 'money-owned-self-screen-time-control',
    };
  }

  if (NATIVE_CONTROL_PATTERN.test(normalizedPrompt) || directScreenTimeControl(normalizedPrompt)) {
    return {
      requestClass: 'native_control',
      participatingCapabilities: ['screenTime'],
      usePrivateContext: true,
      clarification: null,
      policyReason: 'native-capability-authorization-required',
    };
  }

  const capabilities = explicitCapabilities(normalizedPrompt);
  if (
    ACTION_PATTERN.test(normalizedPrompt) && /\bcategor(?:y|ies)\b/i.test(normalizedPrompt) &&
    context.some((candidate) => candidate.capabilityId === 'money') && !capabilities.includes('money')
  ) capabilities.push('money');
  if (
    ACTION_PATTERN.test(normalizedPrompt) &&
    context.some((candidate) => candidate.capabilityId === 'todos' || candidate.capabilityId === 'plan') &&
    /\b(?:later|earlier|after|before|at|on|schedule|move|reschedule)\b/i.test(normalizedPrompt)
  ) {
    if (!capabilities.includes('todos')) capabilities.push('todos');
    if (!capabilities.includes('plan')) capabilities.push('plan');
  }
  if (capabilities.includes('relationships')) {
    const questionOnly = RELATIONSHIP_MEMORY_QUESTION_PATTERN.test(normalizedPrompt) &&
      !RELATIONSHIP_MEMORY_MUTATION_PATTERN.test(normalizedPrompt);
    return {
      requestClass: questionOnly ? 'capability_question' : 'capability_action',
      participatingCapabilities: ['relationships'],
      usePrivateContext: true,
      clarification: null,
      policyReason: questionOnly
        ? 'bounded-relationship-memory-request'
        : 'explicit-relationship-memory-mutation',
    };
  }
  if (DAY_PLAN_RECOMMENDATION_PATTERN.test(normalizedPrompt)) {
    return {
      requestClass: 'capability_question',
      participatingCapabilities: ['plan'],
      usePrivateContext: true,
      clarification: null,
      policyReason: 'day-plan-recommendation',
    };
  }
  if (DAY_PLAN_STATUS_PATTERN.test(normalizedPrompt)) {
    return {
      requestClass: 'capability_question',
      participatingCapabilities: ['plan'],
      usePrivateContext: true,
      clarification: null,
      policyReason: 'day-plan-status',
    };
  }
  const actionCandidate = normalizedPrompt.replace(/\bnext move\b/gi, '');
  const isAction = ACTION_PATTERN.test(actionCandidate);
  if (isAction) {
    const explicitlyNeedsExistingData = /\b(my|our|i have|i've|unfinished)\b/i.test(normalizedPrompt);
    if (capabilities.length === 0) {
      if (AMBIGUOUS_ACTION_TARGET_PATTERN.test(normalizedPrompt)) {
        return {
          requestClass: 'general',
          participatingCapabilities: [],
          usePrivateContext: false,
          clarification: 'What would you like me to change?',
          policyReason: 'ambiguous-action-target',
        };
      }
      return {
        requestClass: 'general',
        participatingCapabilities: [],
        usePrivateContext: false,
        clarification: null,
        policyReason: 'general-assistance-without-capability-owner',
      };
    }
    return {
      requestClass: 'capability_action',
      participatingCapabilities: capabilities,
      usePrivateContext: capabilities.length > 0 &&
        (explicitlyNeedsExistingData || capabilities.includes('profile')),
      clarification: null,
      policyReason: 'typed-capability-proposal-required',
    };
  }

  if (capabilities.length > 0) {
    return {
      requestClass: 'capability_question',
      participatingCapabilities: capabilities,
      usePrivateContext: true,
      clarification: null,
      policyReason: 'bounded-capability-evidence-request',
    };
  }

  if (context.length > 0 && (CONTEXT_REFERENCE_PATTERN.test(normalizedPrompt) || SHORT_DAY_FOLLOW_UP_PATTERN.test(normalizedPrompt))) {
    return {
      requestClass: SHORT_DAY_FOLLOW_UP_PATTERN.test(normalizedPrompt)
        ? 'capability_question'
        : 'general_with_kwilt_context',
      participatingCapabilities: uniqueCapabilities(
        context.map((candidate) => candidate.capabilityId),
      ),
      usePrivateContext: true,
      clarification: null,
      policyReason: 'explicit-reference-to-visible-context',
    };
  }

  return {
    requestClass: 'general',
    participatingCapabilities: [],
    usePrivateContext: false,
    clarification: null,
    policyReason: 'general-answer-without-private-context',
  };
}
