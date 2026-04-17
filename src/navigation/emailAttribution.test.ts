import { parseEmailAttribution } from './emailAttribution';

describe('parseEmailAttribution', () => {
  describe('non-email URLs return null (no false positives)', () => {
    test.each([
      ['empty string', ''],
      ['garbage', 'not-a-url'],
      ['no utm_source', 'kwilt://chapters/abc123'],
      ['utm_source=widget', 'kwilt://today?utm_source=widget'],
      ['utm_source=share', 'https://kwilt.app/goal/g_42?utm_source=share'],
      ['utm_source empty string', 'kwilt://today?utm_source='],
    ])('%s → null', (_label, url) => {
      expect(parseEmailAttribution(url)).toBeNull();
    });
  });

  describe('custom scheme URLs (handoff → scheme launch)', () => {
    test('kwilt://chapters/:id with full UTM set', () => {
      const result = parseEmailAttribution(
        'kwilt://chapters/abc123?utm_source=email&utm_medium=transactional&utm_campaign=chapter_digest',
      );
      expect(result).toEqual({
        utmCampaign: 'chapter_digest',
        utmMedium: 'transactional',
        targetRoute: 'chapters/abc123',
      });
    });

    test('kwilt://today (no path segment)', () => {
      const result = parseEmailAttribution('kwilt://today?utm_source=email&utm_campaign=welcome_day_0');
      expect(result).toEqual({
        utmCampaign: 'welcome_day_0',
        utmMedium: null,
        targetRoute: 'today',
      });
    });

    test('kwilt://settings/subscription (nested path)', () => {
      const result = parseEmailAttribution(
        'kwilt://settings/subscription?utm_source=email&utm_campaign=trial_expiry',
      );
      expect(result?.targetRoute).toBe('settings/subscription');
      expect(result?.utmCampaign).toBe('trial_expiry');
    });

    test('missing utm_campaign is tolerated (null, not empty string)', () => {
      const result = parseEmailAttribution('kwilt://today?utm_source=email');
      expect(result).toEqual({
        utmCampaign: null,
        utmMedium: null,
        targetRoute: 'today',
      });
    });
  });

  describe('universal-link URLs (iOS handoff to associated domain)', () => {
    test('strips the /open/ handoff prefix from go.kwilt.app', () => {
      const result = parseEmailAttribution(
        'https://go.kwilt.app/open/chapters/abc123?utm_source=email&utm_campaign=chapter_digest',
      );
      expect(result?.targetRoute).toBe('chapters/abc123');
      expect(result?.utmCampaign).toBe('chapter_digest');
    });

    test('/open with no suffix normalizes to empty route (app-open default)', () => {
      const result = parseEmailAttribution('https://go.kwilt.app/open?utm_source=email&utm_campaign=welcome_day_1');
      expect(result?.targetRoute).toBe('');
      expect(result?.utmCampaign).toBe('welcome_day_1');
    });

    test('trailing slash on /open/ is tolerated', () => {
      const result = parseEmailAttribution('https://go.kwilt.app/open/?utm_source=email&utm_campaign=marketing');
      expect(result?.targetRoute).toBe('');
    });

    test('apex kwilt.app URLs without /open/ prefix', () => {
      const result = parseEmailAttribution(
        'https://kwilt.app/today?utm_source=email&utm_campaign=welcome_day_0',
      );
      expect(result?.targetRoute).toBe('today');
    });
  });

  describe('edge cases', () => {
    test('does not leak other query params into targetRoute', () => {
      const result = parseEmailAttribution(
        'kwilt://activity/act_42?openFocus=1&utm_source=email&utm_campaign=streak_winback_1',
      );
      expect(result?.targetRoute).toBe('activity/act_42');
    });

    test('case-sensitive utm_source (email vs Email)', () => {
      expect(
        parseEmailAttribution('kwilt://today?utm_source=Email&utm_campaign=x'),
      ).toBeNull();
    });
  });
});
