import { createCookVoiceSilenceDetector } from './cookVoiceSilenceDetector';

describe('Cook voice silence detector', () => {
  it('waits for speech and then ends the utterance after sustained silence', () => {
    const detector = createCookVoiceSilenceDetector({ silenceMs: 900 });

    expect(detector.observe(0.02, 0)).toBe(false);
    expect(detector.observe(0.35, 500)).toBe(false);
    expect(detector.observe(0.31, 600)).toBe(false);
    expect(detector.observe(0.28, 700)).toBe(false);
    expect(detector.observe(0.04, 1400)).toBe(false);
    expect(detector.observe(0.03, 1600)).toBe(true);
  });

  it('does not end an utterance while speech keeps returning', () => {
    const detector = createCookVoiceSilenceDetector({ silenceMs: 900 });

    expect(detector.observe(0.4, 100)).toBe(false);
    expect(detector.observe(0.03, 700)).toBe(false);
    expect(detector.observe(0.25, 900)).toBe(false);
    expect(detector.observe(0.02, 1700)).toBe(false);
  });

  it('ignores an incidental sound that is too brief to be speech', () => {
    const detector = createCookVoiceSilenceDetector({ silenceMs: 900 });

    expect(detector.observe(0.4, 100)).toBe(false);
    expect(detector.observe(0.02, 1200)).toBe(false);
  });
});
