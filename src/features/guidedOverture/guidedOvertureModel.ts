import type { IconName } from '../../ui/Icon';

export type GuidedOvertureMode = 'portfolio' | 'live';

export type GuidedOvertureDestination =
  | 'activities-create'
  | 'plan'
  | 'goals-create'
  | 'agent';

export type GuidedOvertureOffer = {
  id: string;
  capabilityId: string;
  taskLabel: string;
  resultLabel: string;
  sceneLabel: string;
  agentOpeningQuestion: string;
  sceneKind: 'arrange' | 'distill' | 'advance' | 'protect' | 'handoff' | 'begin' | 'preserve';
  coverageTag: string;
  icon: IconName;
  accent: string;
  availability: 'concept' | 'live';
  destination?: GuidedOvertureDestination;
  firstValueContract?: {
    observableResult: string;
  };
};

const PORTFOLIO_OFFERS: readonly GuidedOvertureOffer[] = [
  {
    id: 'plan-tomorrow',
    capabilityId: 'plan',
    taskLabel: 'Plan tomorrow around what matters',
    resultLabel: 'Three priorities now have room on the calendar.',
    sceneLabel: 'A crowded day becomes a plan you can follow.',
    agentOpeningQuestion: 'Let’s make tomorrow workable. What already has to happen?',
    sceneKind: 'arrange',
    coverageTag: 'plan',
    icon: 'plan',
    accent: '#D9A441',
    availability: 'live',
    destination: 'plan',
    firstValueContract: {
      observableResult: 'At least one priority is placed on a specific day in Plan.',
    },
  },
  {
    id: 'catch-bill',
    capabilityId: 'money',
    taskLabel: 'Catch a bill before it surprises me',
    resultLabel: 'The higher charge is flagged before it is due.',
    sceneLabel: 'A quiet change becomes something you can act on.',
    agentOpeningQuestion:
      'Let’s catch the surprise before it lands. Which bill or charge are you worried about?',
    sceneKind: 'distill',
    coverageTag: 'understand',
    icon: 'trendUp',
    accent: '#5D8C70',
    availability: 'concept',
  },
  {
    id: 'photo-story',
    capabilityId: 'stories',
    taskLabel: 'Turn a family photo into a story',
    resultLabel: 'A photo now carries the memory behind it.',
    sceneLabel: 'A moment gets the words you meant to keep.',
    agentOpeningQuestion:
      'Let’s give the photo the story behind it. What do you want someone to remember about that moment?',
    sceneKind: 'preserve',
    coverageTag: 'remember',
    icon: 'camera',
    accent: '#9A6FA8',
    availability: 'concept',
  },
  {
    id: 'pick-game',
    capabilityId: 'games',
    taskLabel: 'Pick a game everyone can play',
    resultLabel: 'You have one choice that fits the group and the time.',
    sceneLabel: 'Five opinions become one easy start.',
    agentOpeningQuestion:
      'Let’s find something your group will actually play. Who’s playing, and how much time do you have?',
    sceneKind: 'begin',
    coverageTag: 'enjoy',
    icon: 'play',
    accent: '#C96F4A',
    availability: 'concept',
  },
  {
    id: 'invite-support',
    capabilityId: 'relationships',
    taskLabel: 'Invite someone to help me follow through',
    resultLabel: 'They can see the goal and choose whether to join.',
    sceneLabel: 'One private goal becomes one clear invitation.',
    agentOpeningQuestion:
      'Let’s make the help clear and comfortable. What are you trying to follow through on, and who might you invite?',
    sceneKind: 'handoff',
    coverageTag: 'connect',
    icon: 'userPlus',
    accent: '#B96275',
    availability: 'concept',
  },
  {
    id: 'sort-week',
    capabilityId: 'agent',
    taskLabel: 'Figure out what to do first this week',
    resultLabel: 'What matters, what is urgent, and what can wait are separated.',
    sceneLabel: 'A crowded week becomes one honest next move.',
    agentOpeningQuestion: 'Let’s sort the week. What feels most urgent or crowded right now?',
    sceneKind: 'distill',
    coverageTag: 'clarify',
    icon: 'sparkles',
    accent: '#7663A8',
    availability: 'live',
    destination: 'agent',
    firstValueContract: {
      observableResult: 'Agent returns a useful next move without silently changing Kwilt data.',
    },
  },
];

const LIVE_OFFERS: readonly GuidedOvertureOffer[] = [
  {
    id: 'add-todo',
    capabilityId: 'activities',
    taskLabel: 'Add a to-do before I forget',
    resultLabel: 'The next step is out of your head and on your list.',
    sceneLabel: 'A loose thought becomes something you can do.',
    agentOpeningQuestion: 'Let’s get it out of your head. What do you need to remember to do?',
    sceneKind: 'advance',
    coverageTag: 'do',
    icon: 'checklist',
    accent: '#5D8C70',
    availability: 'live',
    destination: 'activities-create',
    firstValueContract: {
      observableResult: 'A new to-do appears in Activities and can be opened again.',
    },
  },
  PORTFOLIO_OFFERS[0],
  {
    id: 'start-goal',
    capabilityId: 'goals',
    taskLabel: 'Turn an idea into a goal I can start',
    resultLabel: 'The idea has a clear outcome and a first move.',
    sceneLabel: 'A someday idea becomes a goal you can begin.',
    agentOpeningQuestion: 'Let’s make the idea startable. What do you want to make true?',
    sceneKind: 'advance',
    coverageTag: 'advance',
    icon: 'goals',
    accent: '#C96F4A',
    availability: 'live',
    destination: 'goals-create',
    firstValueContract: {
      observableResult: 'A concrete Goal is saved and its next-step prompt is visible.',
    },
  },
  {
    id: 'ask-kwilt',
    capabilityId: 'agent',
    taskLabel: 'Ask Kwilt to help me sort something out',
    resultLabel: 'Start with the situation. Kwilt will help find the next move.',
    sceneLabel: 'You bring the messy version. Kwilt helps make it workable.',
    agentOpeningQuestion: 'Tell me the messy version. What are you trying to sort out?',
    sceneKind: 'distill',
    coverageTag: 'clarify',
    icon: 'sparkles',
    accent: '#7663A8',
    availability: 'live',
    destination: 'agent',
    firstValueContract: {
      observableResult: 'Agent returns a useful next move without silently changing Kwilt data.',
    },
  },
];

export function getGuidedOvertureOffers(mode: GuidedOvertureMode): GuidedOvertureOffer[] {
  const source = mode === 'portfolio' ? PORTFOLIO_OFFERS : LIVE_OFFERS;
  return selectGuidedOvertureOffers(source, mode);
}

export const GUIDED_OVERTURE_COMPOSITION_VERSION = 'stage1-v3-manual-agent';
export const GUIDED_OVERTURE_PRESENTATION_BUDGET = 6;

export function selectGuidedOvertureOffers(
  source: readonly GuidedOvertureOffer[],
  mode: GuidedOvertureMode,
  limit = GUIDED_OVERTURE_PRESENTATION_BUDGET,
): GuidedOvertureOffer[] {
  const seenCapabilities = new Set<string>();

  const selected: GuidedOvertureOffer[] = [];
  for (const offer of source) {
    if (selected.length >= limit) break;
    if (seenCapabilities.has(offer.capabilityId)) continue;
    if (
      mode === 'live' &&
      (offer.availability !== 'live' || !offer.destination || !offer.firstValueContract)
    ) {
      continue;
    }
    seenCapabilities.add(offer.capabilityId);
    selected.push(offer);
  }
  return selected;
}

export type GuidedOvertureState = {
  phase: 'tour' | 'chooser';
  sceneIndex: number;
};

type GuidedOvertureAction =
  | { type: 'next'; sceneCount: number }
  | { type: 'back' }
  | { type: 'showChooser' }
  | { type: 'restart' };

export function createGuidedOvertureState(_reduceMotion = false): GuidedOvertureState {
  return { phase: 'tour', sceneIndex: 0 };
}

export function guidedOvertureReducer(
  state: GuidedOvertureState,
  action: GuidedOvertureAction,
): GuidedOvertureState {
  if (action.type === 'showChooser') return { ...state, phase: 'chooser' };
  if (action.type === 'restart') return createGuidedOvertureState();
  if (action.type === 'back') {
    return { phase: 'tour', sceneIndex: Math.max(0, state.sceneIndex - 1) };
  }
  if (state.phase === 'chooser') return state;

  const lastIndex = Math.max(0, action.sceneCount - 1);
  if (state.sceneIndex >= lastIndex) {
    return { phase: 'chooser', sceneIndex: lastIndex };
  }

  return { phase: 'tour', sceneIndex: state.sceneIndex + 1 };
}

export type GuidedOvertureAgentHandoff = {
  initialAssistantMessage: string;
  workspaceSnapshot: string;
};

export function buildGuidedOvertureAgentHandoff(
  offer?: GuidedOvertureOffer,
): GuidedOvertureAgentHandoff {
  if (!offer) {
    return {
      initialAssistantMessage:
        'You’ve seen a few ways Kwilt can help. What would make today or this week easier?',
      workspaceSnapshot: [
        'Guided Overture handoff.',
        'No Guided Overture task was selected.',
        'Continue as the conversational guide. Help the person name one useful starting task.',
        'Do not make or imply any mutation without the owning capability’s explicit approval and receipt flow.',
      ].join('\n'),
    };
  }

  return {
    initialAssistantMessage: offer.agentOpeningQuestion,
    workspaceSnapshot: [
      'Guided Overture handoff.',
      `Selected Guided Overture task: ${offer.taskLabel}`,
      `Promised result: ${offer.resultLabel}`,
      `Capability: ${offer.capabilityId}`,
      `Availability in this learning release: ${offer.availability}`,
      'Continue from this intent without repeating the tour or asking which capability they want.',
      'Ask one useful question at a time. Do not claim access to an unavailable capability.',
      'Do not make or imply any mutation without the owning capability’s explicit approval and receipt flow.',
    ].join('\n'),
  };
}

export function buildGuidedOvertureAgentHandoffForOfferId(
  offerId: string,
): GuidedOvertureAgentHandoff | undefined {
  const offer = [...PORTFOLIO_OFFERS, ...LIVE_OFFERS].find(
    (candidate) => candidate.id === offerId,
  );
  return offer ? buildGuidedOvertureAgentHandoff(offer) : undefined;
}
