import { readFileSync } from 'fs';
import path from 'path';

describe('ActivityDetail Focus Screen Time setup offer wiring', () => {
  const source = readFileSync(path.join(__dirname, 'ActivityDetailScreen.tsx'), 'utf8');
  const offerStart = source.indexOf('const focusScreenTimeOfferCard =');
  const offerEnd = source.indexOf('\n\n  const calendarSheetVisible', offerStart);
  const offer = source.slice(offerStart, offerEnd);

  it('dismisses the Focus drawer before opening Screen Time controls', () => {
    const ctaStart = offer.indexOf('onPressCta={() => {');
    const ctaEnd = offer.indexOf('\n      }}', ctaStart);
    const cta = offer.slice(ctaStart, ctaEnd);

    expect(offerStart).toBeGreaterThanOrEqual(0);
    expect(offerEnd).toBeGreaterThan(offerStart);
    expect(cta).toContain('setActiveSheet(null);');
    expect(cta.indexOf('setActiveSheet(null);')).toBeLessThan(
      cta.indexOf("rootNavigationRef.navigate('Settings'"),
    );
  });

  it('uses the contained card shadow inside the scrolling drawer', () => {
    expect(offer).toContain('shadow="single"');
    expect(offer).not.toContain('shadow="layered"');
  });
});
