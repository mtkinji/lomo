import {
  advanceOddballGame,
  beginOddballReveal,
  createOddballGame,
  onePlanScenarios,
  scoreOddballRound,
  startOddballRound,
} from '../onePlan';

const players = ['Maya', 'Leo', 'Nana', 'Ari'];

function recordingGame() {
  return beginOddballReveal(startOddballRound(createOddballGame(players)));
}

describe('Oddball rules', () => {
  it('awards one point to the single largest group and gives the sole unique player the Oddball', () => {
    const result = scoreOddballRound(recordingGame(), {
      winningOptionIndex: 1,
      scorerIds: ['player-1', 'player-2', 'player-3'],
      oddballPlayerId: 'player-4',
    });

    expect(result.players.map((player) => player.score)).toEqual([1, 1, 1, 0]);
    expect(result).toMatchObject({
      phase: 'result',
      oddballPlayerId: 'player-4',
      winnerIds: [],
      outcome: {
        kind: 'scored',
        winningOptionIndex: 1,
        scorerIds: ['player-1', 'player-2', 'player-3'],
        oddballPlayerId: 'player-4',
        markerChanged: true,
      },
    });
  });

  it('keeps the existing Oddball and awards no points when the largest groups tie', () => {
    const marked = { ...recordingGame(), oddballPlayerId: 'player-2' };
    const result = scoreOddballRound(marked, {
      winningOptionIndex: null,
      scorerIds: [],
      oddballPlayerId: null,
    });

    expect(result.players.map((player) => player.score)).toEqual([0, 0, 0, 0]);
    expect(result.oddballPlayerId).toBe('player-2');
    expect(result.outcome).toEqual({ kind: 'tie' });
  });

  it('transfers the Oddball only when a later round identifies one sole unique player', () => {
    const first = scoreOddballRound(recordingGame(), {
      winningOptionIndex: 0,
      scorerIds: ['player-1', 'player-2', 'player-3'],
      oddballPlayerId: 'player-4',
    });
    const next = beginOddballReveal(startOddballRound(advanceOddballGame(first)));
    const result = scoreOddballRound(next, {
      winningOptionIndex: 2,
      scorerIds: ['player-2', 'player-3', 'player-4'],
      oddballPlayerId: 'player-1',
    });

    expect(result.oddballPlayerId).toBe('player-1');
    expect(result.outcome).toMatchObject({ oddballPlayerId: 'player-1', markerChanged: true });
  });

  it('finishes after six questions and does not let the Oddball holder win', () => {
    const game = recordingGame();
    const finalQuestion = {
      ...game,
      roundIndex: 5,
      oddballPlayerId: 'player-1',
      players: game.players.map((player, index) => ({ ...player, score: index === 0 ? 4 : index === 1 ? 3 : 0 })),
    };
    const result = scoreOddballRound(finalQuestion, {
      winningOptionIndex: 0,
      scorerIds: ['player-1', 'player-2'],
      oddballPlayerId: null,
    });

    expect(result.players.map((player) => player.score)).toEqual([5, 4, 0, 0]);
    expect(result.winnerIds).toEqual(['player-2']);
    expect(advanceOddballGame(result).phase).toBe('finished');
  });

  it('preserves shared winners instead of extending a tied final score', () => {
    const game = recordingGame();
    const finalQuestion = {
      ...game,
      roundIndex: 5,
      players: game.players.map((player, index) => ({ ...player, score: index < 2 ? 3 : 0 })),
    };
    const tied = scoreOddballRound(finalQuestion, {
      winningOptionIndex: 2,
      scorerIds: ['player-1', 'player-2'],
      oddballPlayerId: null,
    });

    expect(tied.winnerIds).toEqual(['player-1', 'player-2']);
    expect(advanceOddballGame(tied).phase).toBe('finished');
  });

  it('ignores malformed result reports instead of corrupting the shared score', () => {
    const game = recordingGame();

    expect(scoreOddballRound(game, {
      winningOptionIndex: 3,
      scorerIds: ['player-1'],
      oddballPlayerId: 'player-1',
    })).toEqual(game);
    expect(scoreOddballRound(game, {
      winningOptionIndex: 0,
      scorerIds: ['player-1'],
      oddballPlayerId: null,
    })).toEqual(game);
  });

  it('ships enough complete authored problems for repeat sessions', () => {
    expect(onePlanScenarios.length).toBeGreaterThanOrEqual(12);
    expect(new Set(onePlanScenarios.map((scenario) => scenario.id)).size).toBe(onePlanScenarios.length);
    for (const scenario of onePlanScenarios) {
      expect(scenario.problem.length).toBeGreaterThan(10);
      expect(scenario.options).toHaveLength(3);
      expect(scenario.options.every((option) => option.label && option.consequence)).toBe(true);
      expect(scenario.chaosConsequence.length).toBeGreaterThan(10);
    }
  });
});
