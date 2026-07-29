import {
  advanceReveal,
  beginSlanguageRound,
  reconcileSlanguageDeadline,
  slanguagePublicSubmissionIds,
  validateSlanguageAction,
  type ServerSlanguageState,
} from '../../../../../supabase/functions/_shared/games-slanguage';

const participants = ['host', 'olive', 'grandma'];
const now = new Date('2026-07-20T18:00:00.000Z');

function lobby(): ServerSlanguageState {
  return {
    phase: 'lobby', status: 'playing', capacity: 8, roundIndex: 0, totalRounds: 5,
    promptId: null, deadline: null, revealOrder: [], revealIndex: 0, revealStartedAt: null,
    crowns: {}, crownScores: {}, roundWinnerIds: [], winnerIds: [],
  };
}

describe('authoritative Slanguage room rules', () => {
  test('only the host starts and at least three players are required', () => {
    expect(() => validateSlanguageAction(lobby(), { type: 'start' }, { participantId: 'olive', isHost: false, participantIds: participants }, now)).toThrow('host_only');
    expect(() => validateSlanguageAction(lobby(), { type: 'start' }, { participantId: 'host', isHost: true, participantIds: ['host', 'olive'] }, now)).toThrow('players_must_be_three_to_eight');
    expect(validateSlanguageAction(lobby(), { type: 'start' }, { participantId: 'host', isHost: true, participantIds: participants }, now)).toBeUndefined();
  });

  test('starts a 60-second build with deterministic private hands', () => {
    const round = beginSlanguageRound(lobby(), participants, now);
    expect(round.state).toMatchObject({ phase: 'build', promptId: 'party-exit', roundIndex: 0 });
    expect(round.state.deadline).toBe('2026-07-20T18:01:00.000Z');
    expect(round.hands).toHaveLength(3);
    expect(round.hands.every((hand) => hand.tileIds.length === 12)).toBe(true);
    expect(round.hands[0].tileIds).not.toEqual(round.hands[1].tileIds);
  });

  test('accepts submissions only from the build phase and rejects self votes', () => {
    const state = beginSlanguageRound(lobby(), participants, now).state;
    expect(validateSlanguageAction(state, { type: 'submit_translation' }, { participantId: 'olive', isHost: false, participantIds: participants }, now)).toBeUndefined();
    expect(() => validateSlanguageAction({ ...state, phase: 'vote' }, { type: 'submit_vote', submissionParticipantId: 'olive' }, { participantId: 'olive', isHost: false, participantIds: participants }, now)).toThrow('cannot_vote_for_self');
  });

  test('reveals only the current answer and enforces the three-second hold', () => {
    const state: ServerSlanguageState = {
      ...beginSlanguageRound(lobby(), participants, now).state,
      phase: 'reveal', revealOrder: participants, revealIndex: 0, revealStartedAt: now.toISOString(), deadline: new Date(now.getTime() + 7000).toISOString(),
    };
    expect(slanguagePublicSubmissionIds(state)).toEqual(['host']);
    expect(() => advanceReveal(state, new Date(now.getTime() + 2000))).toThrow('reveal_hold');
    expect(advanceReveal(state, new Date(now.getTime() + 3000))).toMatchObject({ revealIndex: 1, revealStartedAt: '2026-07-20T18:00:03.000Z' });
  });

  test('deadline reconciliation moves build to reveal and reveal to the next answer', () => {
    const build = beginSlanguageRound(lobby(), participants, now).state;
    const reveal = reconcileSlanguageDeadline(build, ['host', 'olive'], [], new Date(now.getTime() + 61000));
    expect(reveal).toMatchObject({ phase: 'reveal', revealOrder: ['host', 'olive'], revealIndex: 0 });
    const next = reconcileSlanguageDeadline(reveal, ['host', 'olive'], [], new Date(new Date(reveal.deadline!).getTime() + 1));
    expect(next).toMatchObject({ phase: 'reveal', revealIndex: 1 });
  });

  test('reveals a sole translation, then skips the empty ballot without awarding a Crown', () => {
    const build = beginSlanguageRound(lobby(), participants, now).state;
    const reveal = reconcileSlanguageDeadline(
      build,
      [{ participantId: 'host', slangScore: 9 }],
      [],
      new Date(now.getTime() + 61_000),
    );

    expect(reveal).toMatchObject({ phase: 'reveal', revealOrder: ['host'] });
    const result = reconcileSlanguageDeadline(
      reveal,
      [{ participantId: 'host', slangScore: 9 }],
      [],
      new Date(new Date(reveal.deadline!).getTime() + 1),
    );
    expect(result).toMatchObject({ phase: 'result', roundWinnerIds: [], crowns: {} });
  });
});
