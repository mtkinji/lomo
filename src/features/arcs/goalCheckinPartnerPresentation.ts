import type { GoalPartnerAvatar } from './goalPartnerAccessPresentation';

type GoalCheckinPartnerPresentationInput = {
  partnerAvatars: GoalPartnerAvatar[];
  partnerCircleKey: string | null | undefined;
  isDevelopment: boolean;
};

export type GoalCheckinPartnerPresentation = {
  partnerDisplayNames: string[];
  approvalPartnerDisplayNames: string[];
  approvalPartnerCount: number;
};

export function buildGoalCheckinPartnerPresentation({
  partnerAvatars,
  partnerCircleKey,
  isDevelopment,
}: GoalCheckinPartnerPresentationInput): GoalCheckinPartnerPresentation {
  const partnerDisplayNames = partnerAvatars
    .map((partner) => (partner.name ?? '').trim())
    .filter((name) => name.length > 0);
  const usesDevelopmentPreview =
    isDevelopment && partnerCircleKey?.includes('dev-partner') === true;

  return {
    partnerDisplayNames,
    approvalPartnerDisplayNames: usesDevelopmentPreview ? ['Jordan'] : partnerDisplayNames,
    approvalPartnerCount: usesDevelopmentPreview ? 1 : partnerAvatars.length,
  };
}
