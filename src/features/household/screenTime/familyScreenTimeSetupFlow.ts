export type FamilyScreenTimeSetupStep =
  | 'connect_device'
  | 'choose_apps'
  | 'review_agreement'
  | 'preview_child'
  | 'activate'
  | 'complete';

export type FamilyScreenTimeSetupFacts = {
  capabilityActive: boolean;
  deviceReady: boolean;
  selectionReady: boolean;
  agreementReviewed: boolean;
  childPreviewReviewed: boolean;
  desiredVersion: number;
  appliedVersion: number | null;
};

export function resolveFamilyScreenTimeSetupStep(
  facts: FamilyScreenTimeSetupFacts,
): FamilyScreenTimeSetupStep {
  if (!facts.capabilityActive || !facts.deviceReady) return 'connect_device';
  if (!facts.selectionReady) return 'choose_apps';
  if (!facts.agreementReviewed) return 'review_agreement';
  if (!facts.childPreviewReviewed) return 'preview_child';
  if (facts.desiredVersion <= 0 || facts.appliedVersion !== facts.desiredVersion) return 'activate';
  return 'complete';
}
