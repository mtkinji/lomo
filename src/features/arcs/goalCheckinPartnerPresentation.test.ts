import { buildGoalCheckinPartnerPresentation } from './goalCheckinPartnerPresentation';

describe('buildGoalCheckinPartnerPresentation', () => {
  const partnerAvatars = [
    { id: 'partner-1', name: '  Jordan  ', avatarUrl: null },
    { id: 'partner-2', name: '   ', avatarUrl: null },
    { id: 'partner-3', name: null, avatarUrl: null },
  ];

  it('filters blank display names while preserving the live partner count', () => {
    expect(
      buildGoalCheckinPartnerPresentation({
        partnerAvatars,
        partnerCircleKey: 'partner-1|partner-2|partner-3',
        isDevelopment: false,
      }),
    ).toEqual({
      partnerDisplayNames: ['Jordan'],
      approvalPartnerDisplayNames: ['Jordan'],
      approvalPartnerCount: 3,
    });
  });

  it('uses the development draft preview partner when its circle key is present', () => {
    expect(
      buildGoalCheckinPartnerPresentation({
        partnerAvatars,
        partnerCircleKey: 'goal|dev-partner|preview',
        isDevelopment: true,
      }),
    ).toEqual({
      partnerDisplayNames: ['Jordan'],
      approvalPartnerDisplayNames: ['Jordan'],
      approvalPartnerCount: 1,
    });
  });

  it('does not apply the development preview override in production', () => {
    expect(
      buildGoalCheckinPartnerPresentation({
        partnerAvatars,
        partnerCircleKey: 'goal|dev-partner|preview',
        isDevelopment: false,
      }),
    ).toEqual({
      partnerDisplayNames: ['Jordan'],
      approvalPartnerDisplayNames: ['Jordan'],
      approvalPartnerCount: 3,
    });
  });
});
