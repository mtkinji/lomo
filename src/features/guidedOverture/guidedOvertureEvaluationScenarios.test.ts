import { resolveGuidedOvertureEntry } from './guidedOvertureEntryPolicy';
import { getGuidedOvertureOffers } from './guidedOvertureModel';
import {
  GUIDED_OVERTURE_OUTCOME_COVERAGE,
  GUIDED_OVERTURE_PERSONA_SCENARIOS,
} from './guidedOvertureEvaluationScenarios';

describe('Guided Overture evaluation scenarios', () => {
  const portfolioOfferIds = new Set(
    getGuidedOvertureOffers('portfolio').map((offer) => offer.id),
  );

  it('keeps every canonical Kwilt persona in the evaluation program', () => {
    expect(GUIDED_OVERTURE_PERSONA_SCENARIOS.map((scenario) => scenario.persona)).toEqual([
      'Maya',
      'Marcus',
      'Nina',
      'Sarah',
      'Elena',
      'David',
    ]);
  });

  it('gives every unscoped persona at least one deliberately relevant portfolio task', () => {
    const unscopedScenarios = GUIDED_OVERTURE_PERSONA_SCENARIOS.filter(
      (scenario) => scenario.startingPoint === 'unscoped-download',
    );

    for (const scenario of unscopedScenarios) {
      expect(
        scenario.relevantOfferIds.some((offerId) => portfolioOfferIds.has(offerId)),
      ).toBe(true);
    }
  });

  it('honors the expected entry contract for each persona starting point', () => {
    for (const scenario of GUIDED_OVERTURE_PERSONA_SCENARIOS) {
      expect(
        resolveGuidedOvertureEntry({
          releaseStage: 'internal-first-run',
          startingPoint: scenario.startingPoint,
          assignedToOverture: true,
        }),
      ).toBe(scenario.expectedEntry);
    }
  });

  it('represents every promised suite outcome with a concrete portfolio task', () => {
    for (const outcome of GUIDED_OVERTURE_OUTCOME_COVERAGE) {
      expect(outcome.offerIds.some((offerId) => portfolioOfferIds.has(offerId))).toBe(true);
    }
  });
});
