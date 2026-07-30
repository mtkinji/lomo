import {
  advanceOnePlan,
  beginOnePlanReveal,
  createOnePlanGame,
  onePlanScenarios,
  reportOnePlanConsensus,
  reportOnePlanSplit,
} from '../onePlan';

describe('Show of Hands rules', () => {
  it('turns a first-reveal consensus into one Bridge and a consequence', () => {
    const choosing = createOnePlanGame();
    const reveal = beginOnePlanReveal(choosing);
    const result = reportOnePlanConsensus(reveal, 1);

    expect(result).toMatchObject({
      phase: 'consequence', bridges: 1, chaos: 0,
      outcome: { kind: 'bridge', optionIndex: 1, vote: 'first' },
    });
  });

  it('gives a split group one pitch before the final reveal', () => {
    const firstReveal = beginOnePlanReveal(createOnePlanGame());
    const pitch = reportOnePlanSplit(firstReveal);

    expect(pitch).toMatchObject({ phase: 'pitch', bridges: 0, chaos: 0, outcome: null });

    const finalReveal = beginOnePlanReveal(pitch);
    const result = reportOnePlanConsensus(finalReveal, 2);
    expect(result).toMatchObject({
      phase: 'consequence', bridges: 1, chaos: 0,
      outcome: { kind: 'bridge', optionIndex: 2, vote: 'final' },
    });
  });

  it('adds Chaos only when the final reveal is still split', () => {
    const firstReveal = beginOnePlanReveal(createOnePlanGame());
    const pitch = reportOnePlanSplit(firstReveal);
    const finalReveal = beginOnePlanReveal(pitch);
    const result = reportOnePlanSplit(finalReveal);

    expect(result).toMatchObject({
      phase: 'consequence', bridges: 0, chaos: 1,
      outcome: { kind: 'chaos' },
    });
  });

  it('ends after the third Bridge and ignores duplicate reveal reports', () => {
    let game = createOnePlanGame();
    for (let round = 0; round < 3; round += 1) {
      const reveal = beginOnePlanReveal(game);
      const consequence = reportOnePlanConsensus(reveal, round % 3);
      expect(reportOnePlanConsensus(consequence, 0)).toEqual(consequence);
      game = advanceOnePlan(consequence);
    }

    expect(game).toMatchObject({ phase: 'finished', bridges: 3, chaos: 0, winner: 'bridges' });
  });

  it('ends after the third Chaos result', () => {
    let game = createOnePlanGame();
    for (let round = 0; round < 3; round += 1) {
      game = reportOnePlanSplit(beginOnePlanReveal(game));
      game = reportOnePlanSplit(beginOnePlanReveal(game));
      game = advanceOnePlan(game);
    }

    expect(game).toMatchObject({ phase: 'finished', bridges: 0, chaos: 3, winner: 'chaos' });
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
