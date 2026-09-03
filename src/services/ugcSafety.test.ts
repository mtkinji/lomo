import { buildUgcReportPayload, reportErrorMessage, safetyReceiptPresentation } from './ugcSafety';

describe('UGC safety request contract', () => {
  it('normalizes bounded report input', () => {
    expect(buildUgcReportPayload({
      targetKind: 'shared_delivery',
      targetId: ' report-id ',
      reason: 'harassment',
      note: '  Repeated unwanted contact.  ',
    }, { appVersion: '1.0.78', buildNumber: '120' })).toEqual({
      targetKind: 'shared_delivery',
      targetId: 'report-id',
      reason: 'harassment',
      note: 'Repeated unwanted contact.',
      appVersion: '1.0.78',
      buildNumber: '120',
    });
  });

  it('builds a Household member report without requiring a user id in the client payload', () => {
    expect(buildUgcReportPayload({
      targetKind: 'household_member',
      targetId: ' membership-id ',
      reason: 'privacy',
    }, { appVersion: null, buildNumber: null })).toMatchObject({
      targetKind: 'household_member',
      targetId: 'membership-id',
    });
  });

  it.each(['meal_reaction', 'guest_meal_feedback'] as const)(
    'builds a contextual %s report without trusting a client identity',
    (targetKind) => {
      expect(buildUgcReportPayload({
        targetKind,
        targetId: ' target-id ',
        reason: 'harassment',
      }, { appVersion: null, buildNumber: null })).toMatchObject({
        targetKind,
        targetId: 'target-id',
      });
    },
  );

  it('does not offer a social block for a managed child household report', () => {
    expect(safetyReceiptPresentation(
      { kind: 'household_help', reporterRole: 'child' },
      'Caregiver',
    )).toEqual({
      title: 'Your report was sent privately.',
      body: 'Kwilt saved what happened for safety review. Caregiver is not notified by this report.',
      canBlock: false,
    });
  });

  it('offers immediate blocking only for peer relationships', () => {
    expect(safetyReceiptPresentation({ kind: 'peer_block' }, 'Taylor').canBlock).toBe(true);
    expect(safetyReceiptPresentation(
      { kind: 'manage_household', reporterRole: 'caregiver' },
      'Taylor',
    )).toEqual({
      title: 'Report sent.',
      body: 'Taylor is part of your Household. Household access is managed separately in Family settings.',
      canBlock: false,
    });
  });

  it('keeps guest-link control separate from reporting and blocking', () => {
    expect(safetyReceiptPresentation({ kind: 'guest_scope' }, 'Guest')).toEqual({
      title: 'Report sent.',
      body: 'Kwilt saved the guest response for review. You can turn off the guest link separately to prevent more responses.',
      canBlock: false,
    });
  });

  it('uses calm messages for filter and intake failures', () => {
    expect(reportErrorMessage({ message: 'shared_text_not_allowed' })).toBe(
      'That wording can’t be shared. Change it and try again.',
    );
    expect(reportErrorMessage({ message: 'network failed' })).toBe(
      'Your report could not be sent. Check your connection and try again.',
    );
  });
});
