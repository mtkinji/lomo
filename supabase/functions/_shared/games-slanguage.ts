import {
  SLANGUAGE_PROMPTS,
  dealSlanguageHand,
  resolveSlanguageRound,
  type SlanguagePlacements,
} from '../../../src/capabilities/games/domain/slanguage.ts';

export type ServerSlanguagePhase = 'lobby' | 'build' | 'reveal' | 'vote' | 'result' | 'finished';

export type ServerSlanguageState = {
  phase: ServerSlanguagePhase;
  status: 'playing' | 'finished';
  capacity: number;
  roundIndex: number;
  totalRounds: number;
  promptId: string | null;
  deadline: string | null;
  revealOrder: string[];
  revealIndex: number;
  revealStartedAt: string | null;
  crowns: Record<string, number>;
  crownScores: Record<string, number>;
  roundWinnerIds: string[];
  winnerIds: string[];
};

export type ServerSlanguageAction =
  | { type: 'view' | 'start' | 'submit_translation' | 'advance_reveal' | 'next_round' }
  | { type: 'submit_vote'; submissionParticipantId: string };

export type SlanguageCommandContext = {
  participantId: string;
  isHost: boolean;
  participantIds: string[];
};

export type SlanguagePrivateHand = {
  participantId: string;
  tileIds: string[];
};

export type SlanguageSubmissionResult = {
  participantId: string;
  slangScore: number;
};

export type SlanguageVote = {
  voterParticipantId: string;
  submissionParticipantId: string;
};

const BUILD_MS = 60_000;
const REVEAL_MS = 7_000;
const REVEAL_HOLD_MS = 3_000;
const VOTE_MS = 15_000;

function isoAfter(now: Date, milliseconds: number) {
  return new Date(now.getTime() + milliseconds).toISOString();
}

export function validateSlanguageAction(state: ServerSlanguageState, action: ServerSlanguageAction, context: SlanguageCommandContext, now: Date) {
  if (action.type === 'view') return;
  if (action.type === 'start') {
    if (!context.isHost) throw new Error('host_only');
    if (state.phase !== 'lobby') throw new Error('wrong_phase');
    if (context.participantIds.length < 3 || context.participantIds.length > 8) throw new Error('players_must_be_three_to_eight');
    return;
  }
  if (action.type === 'submit_translation') {
    if (state.phase !== 'build') throw new Error('wrong_phase');
    if (state.deadline && now.getTime() > new Date(state.deadline).getTime()) throw new Error('round_closed');
    return;
  }
  if (action.type === 'advance_reveal') {
    if (state.phase !== 'reveal') throw new Error('wrong_phase');
    if (state.revealStartedAt && now.getTime() - new Date(state.revealStartedAt).getTime() < REVEAL_HOLD_MS) throw new Error('reveal_hold');
    return;
  }
  if (action.type === 'submit_vote') {
    if (state.phase !== 'vote') throw new Error('wrong_phase');
    if (action.submissionParticipantId === context.participantId) throw new Error('cannot_vote_for_self');
    if (!state.revealOrder.includes(action.submissionParticipantId)) throw new Error('submission_not_found');
    if (state.deadline && now.getTime() > new Date(state.deadline).getTime()) throw new Error('vote_closed');
    return;
  }
  if (state.phase !== 'result') throw new Error('wrong_phase');
}

export function beginSlanguageRound(state: ServerSlanguageState, participantIds: string[], now: Date) {
  const prompt = SLANGUAGE_PROMPTS[state.roundIndex % SLANGUAGE_PROMPTS.length];
  const hands = participantIds.map((participantId, index) => ({
    participantId,
    tileIds: dealSlanguageHand(prompt, index + state.roundIndex).map((tile) => tile.id),
  }));
  return {
    state: {
      ...state,
      phase: 'build' as const,
      status: 'playing' as const,
      promptId: prompt.id,
      deadline: isoAfter(now, BUILD_MS),
      revealOrder: [],
      revealIndex: 0,
      revealStartedAt: null,
      roundWinnerIds: [],
      winnerIds: [],
    },
    hands,
  };
}

function submissionIds(submissions: (string | SlanguageSubmissionResult)[]) {
  return submissions.map((entry) => typeof entry === 'string' ? entry : entry.participantId);
}

export function beginSlanguageReveal(state: ServerSlanguageState, submissions: (string | SlanguageSubmissionResult)[], now: Date): ServerSlanguageState {
  const ids = submissionIds(submissions);
  if (ids.length === 0) return { ...state, phase: 'result', deadline: null, revealOrder: [], revealIndex: 0, revealStartedAt: null, roundWinnerIds: [] };
  const offset = state.roundIndex % ids.length;
  const revealOrder = [...ids.slice(offset), ...ids.slice(0, offset)];
  return {
    ...state,
    phase: 'reveal',
    revealOrder,
    revealIndex: 0,
    revealStartedAt: now.toISOString(),
    deadline: isoAfter(now, REVEAL_MS),
  };
}

export function slanguagePublicSubmissionIds(state: ServerSlanguageState) {
  if (state.phase === 'reveal') return state.revealOrder.slice(0, state.revealIndex + 1);
  if (state.phase === 'vote' || state.phase === 'result' || state.phase === 'finished') return state.revealOrder;
  return [];
}

export function advanceReveal(state: ServerSlanguageState, now: Date): ServerSlanguageState {
  if (state.phase !== 'reveal') throw new Error('wrong_phase');
  if (state.revealStartedAt && now.getTime() - new Date(state.revealStartedAt).getTime() < REVEAL_HOLD_MS) throw new Error('reveal_hold');
  if (state.revealIndex + 1 >= state.revealOrder.length) {
    if (state.revealOrder.length < 2) {
      return { ...state, phase: 'result', deadline: null, revealStartedAt: null, roundWinnerIds: [] };
    }
    return { ...state, phase: 'vote', deadline: isoAfter(now, VOTE_MS), revealStartedAt: null };
  }
  return { ...state, revealIndex: state.revealIndex + 1, revealStartedAt: now.toISOString(), deadline: isoAfter(now, REVEAL_MS) };
}

export function resolveServerSlanguageRound(state: ServerSlanguageState, submissions: SlanguageSubmissionResult[], votes: SlanguageVote[]) {
  const entries = submissions.map((submission) => ({
    participantId: submission.participantId,
    slangScore: submission.slangScore,
    votes: votes.filter((vote) => vote.submissionParticipantId === submission.participantId).length,
  }));
  const roundWinnerIds = resolveSlanguageRound(entries);
  const crowns = { ...state.crowns };
  const crownScores = { ...state.crownScores };
  for (const winnerId of roundWinnerIds) {
    const score = submissions.find((entry) => entry.participantId === winnerId)?.slangScore ?? 0;
    crowns[winnerId] = (crowns[winnerId] ?? 0) + 1;
    crownScores[winnerId] = (crownScores[winnerId] ?? 0) + score;
  }
  return { ...state, phase: 'result' as const, deadline: null, crowns, crownScores, roundWinnerIds };
}

export function nextServerSlanguageRound(state: ServerSlanguageState, participantIds: string[], now: Date) {
  if (state.phase !== 'result') throw new Error('wrong_phase');
  if (state.roundIndex + 1 < state.totalRounds) return beginSlanguageRound({ ...state, roundIndex: state.roundIndex + 1 }, participantIds, now);
  const highestCrowns = Math.max(0, ...Object.values(state.crowns));
  const crownLeaders = Object.keys(state.crowns).filter((id) => state.crowns[id] === highestCrowns);
  const highestScore = Math.max(0, ...crownLeaders.map((id) => state.crownScores[id] ?? 0));
  const winnerIds = crownLeaders.filter((id) => (state.crownScores[id] ?? 0) === highestScore);
  return { state: { ...state, phase: 'finished' as const, status: 'finished' as const, winnerIds }, hands: [] as SlanguagePrivateHand[] };
}

export function reconcileSlanguageDeadline(
  state: ServerSlanguageState,
  submissions: (string | SlanguageSubmissionResult)[],
  votes: SlanguageVote[],
  now: Date,
) {
  if (!state.deadline || now.getTime() <= new Date(state.deadline).getTime()) return state;
  if (state.phase === 'build') return beginSlanguageReveal(state, submissions, now);
  if (state.phase === 'reveal') return advanceReveal({ ...state, revealStartedAt: new Date(now.getTime() - REVEAL_HOLD_MS).toISOString() }, now);
  if (state.phase === 'vote') {
    const scored = submissions.filter((entry): entry is SlanguageSubmissionResult => typeof entry !== 'string');
    return resolveServerSlanguageRound(state, scored, votes);
  }
  return state;
}

export type { SlanguagePlacements };
