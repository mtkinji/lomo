import { getGuidedOvertureOffers } from './guidedOvertureModel';
import {
  evaluateGuidedOvertureStudy,
  type GuidedOvertureDeviceEvidence,
  type GuidedOvertureStudyObservation,
} from './guidedOvertureResearchDecision';

const personas = ['Maya', 'Marcus', 'Nina', 'Sarah', 'Elena'] as const;

function observation(
  index: number,
  overrides: Partial<GuidedOvertureStudyObservation> = {},
): GuidedOvertureStudyObservation {
  return {
    sessionId: `session-${index + 1}`,
    persona: personas[index % personas.length],
    productivityPosture:
      index === 0
        ? 'complex-system-user'
        : index === 1
          ? 'not-productivity-user'
          : 'neither',
    recalledCoverageTags: ['plan', 'understand', 'remember'],
    selectedStartingPoint: 'plan-tomorrow',
    choseWithoutExplanation: true,
    expectedNextStepConsistent: true,
    mistookConceptForShipped: false,
    ...overrides,
  };
}

function completeDeviceEvidence(
  overrides: Partial<GuidedOvertureDeviceEvidence> = {},
): GuidedOvertureDeviceEvidence {
  const liveOfferIds = getGuidedOvertureOffers('live').map((offer) => offer.id);
  return {
    liveOfferIdsAttempted: liveOfferIds,
    liveOfferIdsReachedFirstValue: liveOfferIds,
    equivalentChoiceModes: ['standard', 'reduced-motion', 'screen-reader'],
    replayPreservedAccountState: true,
    ...overrides,
  };
}

describe('evaluateGuidedOvertureStudy', () => {
  it('does not make a decision before five moderated sessions', () => {
    const result = evaluateGuidedOvertureStudy({
      observations: [0, 1, 2, 3].map((index) => observation(index)),
      deviceEvidence: completeDeviceEvidence(),
    });

    expect(result.status).toBe('insufficient-evidence');
    expect(result.reasons).toContain('Run at least five moderated sessions.');
  });

  it('advances only when the pre-registered participant and device gates pass', () => {
    const result = evaluateGuidedOvertureStudy({
      observations: [0, 1, 2, 3, 4].map((index) => observation(index)),
      deviceEvidence: completeDeviceEvidence(),
    });

    expect(result.status).toBe('advance');
    expect(result.metrics).toMatchObject({
      sessionCount: 5,
      personaPatternCount: 5,
      spontaneousChoiceCount: 5,
      expectationConsistentCount: 5,
    });
    expect(result.reasons).toEqual([]);
  });

  it('holds when recall, choice, or expectation quality misses the threshold', () => {
    const observations = [0, 1, 2, 3, 4].map((index) => observation(index));
    observations[0] = observation(0, { recalledCoverageTags: ['plan', 'clarify'] });
    observations[1] = observation(1, { choseWithoutExplanation: false });
    observations[2] = observation(2, { choseWithoutExplanation: false });
    observations[3] = observation(3, { expectedNextStepConsistent: false });
    observations[4] = observation(4, { expectedNextStepConsistent: false });

    const result = evaluateGuidedOvertureStudy({
      observations,
      deviceEvidence: completeDeviceEvidence(),
    });

    expect(result.status).toBe('hold');
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        'Every participant must recall at least three materially different forms of help.',
        'At least four of five participants must choose without facilitator explanation.',
        'At least 80% of participants must predict a next step consistent with the offer contract.',
      ]),
    );
  });

  it('holds when the sample misses persona or productivity-posture coverage', () => {
    const observations = [0, 1, 2, 3, 4].map((index) =>
      observation(index, {
        persona: index < 3 ? 'Maya' : 'Marcus',
        productivityPosture: 'neither',
      }),
    );

    const result = evaluateGuidedOvertureStudy({
      observations,
      deviceEvidence: completeDeviceEvidence(),
    });

    expect(result.status).toBe('hold');
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        'Include at least four distinct persona patterns.',
        'Include at least one complex productivity-system user.',
        'Include at least one person who does not identify as a productivity-app user.',
      ]),
    );
  });

  it('holds if anyone mistakes a concept for a shipped capability', () => {
    const observations = [0, 1, 2, 3, 4].map((index) => observation(index));
    observations[2] = observation(2, { mistookConceptForShipped: true });

    const result = evaluateGuidedOvertureStudy({
      observations,
      deviceEvidence: completeDeviceEvidence(),
    });

    expect(result.status).toBe('hold');
    expect(result.reasons).toContain(
      'No participant may mistake a portfolio concept for a shipped capability.',
    );
  });

  it('holds until every live offer reaches first value in every required access mode', () => {
    const liveOfferIds = getGuidedOvertureOffers('live').map((offer) => offer.id);
    const result = evaluateGuidedOvertureStudy({
      observations: [0, 1, 2, 3, 4].map((index) => observation(index)),
      deviceEvidence: completeDeviceEvidence({
        liveOfferIdsReachedFirstValue: liveOfferIds.slice(0, -1),
        equivalentChoiceModes: ['standard', 'reduced-motion'],
        replayPreservedAccountState: false,
      }),
    });

    expect(result.status).toBe('hold');
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        'Every live offer must reach its observable first-value result.',
        'Standard, reduced-motion, and screen-reader modes must expose equivalent choices and meaning.',
        'Replaying the lab must preserve onboarding, permissions, and domain data.',
      ]),
    );
  });
});
