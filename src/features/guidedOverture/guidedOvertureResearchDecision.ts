import { getGuidedOvertureOffers } from './guidedOvertureModel';
import type { GuidedOverturePersonaScenario } from './guidedOvertureEvaluationScenarios';

export type GuidedOvertureProductivityPosture =
  | 'complex-system-user'
  | 'not-productivity-user'
  | 'neither';

export type GuidedOvertureStudyObservation = {
  sessionId: string;
  persona: GuidedOverturePersonaScenario['persona'];
  productivityPosture: GuidedOvertureProductivityPosture;
  recalledCoverageTags: readonly string[];
  selectedStartingPoint: string;
  choseWithoutExplanation: boolean;
  expectedNextStepConsistent: boolean;
  mistookConceptForShipped: boolean;
};

export type GuidedOvertureAccessMode = 'standard' | 'reduced-motion' | 'screen-reader';

export type GuidedOvertureDeviceEvidence = {
  liveOfferIdsAttempted: readonly string[];
  liveOfferIdsReachedFirstValue: readonly string[];
  equivalentChoiceModes: readonly GuidedOvertureAccessMode[];
  replayPreservedAccountState: boolean;
};

export type GuidedOvertureStudyDecision = {
  status: 'insufficient-evidence' | 'advance' | 'hold';
  reasons: string[];
  metrics: {
    sessionCount: number;
    personaPatternCount: number;
    spontaneousChoiceCount: number;
    expectationConsistentCount: number;
  };
};

const REQUIRED_ACCESS_MODES: readonly GuidedOvertureAccessMode[] = [
  'standard',
  'reduced-motion',
  'screen-reader',
];

export function evaluateGuidedOvertureStudy({
  observations,
  deviceEvidence,
}: {
  observations: readonly GuidedOvertureStudyObservation[];
  deviceEvidence: GuidedOvertureDeviceEvidence;
}): GuidedOvertureStudyDecision {
  const metrics = {
    sessionCount: observations.length,
    personaPatternCount: new Set(observations.map((observation) => observation.persona)).size,
    spontaneousChoiceCount: observations.filter((observation) => observation.choseWithoutExplanation)
      .length,
    expectationConsistentCount: observations.filter(
      (observation) => observation.expectedNextStepConsistent,
    ).length,
  };

  if (metrics.sessionCount < 5) {
    return {
      status: 'insufficient-evidence',
      reasons: ['Run at least five moderated sessions.'],
      metrics,
    };
  }

  const reasons: string[] = [];

  if (metrics.personaPatternCount < 4) {
    reasons.push('Include at least four distinct persona patterns.');
  }
  if (!observations.some((observation) => observation.productivityPosture === 'complex-system-user')) {
    reasons.push('Include at least one complex productivity-system user.');
  }
  if (
    !observations.some((observation) => observation.productivityPosture === 'not-productivity-user')
  ) {
    reasons.push('Include at least one person who does not identify as a productivity-app user.');
  }
  if (
    observations.some(
      (observation) => new Set(observation.recalledCoverageTags).size < 3,
    )
  ) {
    reasons.push('Every participant must recall at least three materially different forms of help.');
  }

  const requiredSpontaneousChoices = Math.ceil(metrics.sessionCount * 0.75);
  if (metrics.spontaneousChoiceCount < requiredSpontaneousChoices) {
    reasons.push(
      metrics.sessionCount === 5
        ? 'At least four of five participants must choose without facilitator explanation.'
        : `At least ${requiredSpontaneousChoices} of ${metrics.sessionCount} participants must choose without facilitator explanation.`,
    );
  }

  if (metrics.expectationConsistentCount / metrics.sessionCount < 0.8) {
    reasons.push(
      'At least 80% of participants must predict a next step consistent with the offer contract.',
    );
  }
  if (observations.some((observation) => observation.mistookConceptForShipped)) {
    reasons.push('No participant may mistake a portfolio concept for a shipped capability.');
  }

  const expectedLiveOfferIds = getGuidedOvertureOffers('live').map((offer) => offer.id);
  const attempted = new Set(deviceEvidence.liveOfferIdsAttempted);
  const reachedFirstValue = new Set(deviceEvidence.liveOfferIdsReachedFirstValue);
  if (
    expectedLiveOfferIds.some(
      (offerId) => !attempted.has(offerId) || !reachedFirstValue.has(offerId),
    )
  ) {
    reasons.push('Every live offer must reach its observable first-value result.');
  }

  const equivalentModes = new Set(deviceEvidence.equivalentChoiceModes);
  if (REQUIRED_ACCESS_MODES.some((mode) => !equivalentModes.has(mode))) {
    reasons.push(
      'Standard, reduced-motion, and screen-reader modes must expose equivalent choices and meaning.',
    );
  }
  if (!deviceEvidence.replayPreservedAccountState) {
    reasons.push('Replaying the lab must preserve onboarding, permissions, and domain data.');
  }

  return {
    status: reasons.length === 0 ? 'advance' : 'hold',
    reasons,
    metrics,
  };
}
