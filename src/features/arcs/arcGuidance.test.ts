import type { Arc } from '../../domain/types';
import { buildLocalArcGuideFallback, hasArcGuide } from './arcGuidance';

const makeArc = (overrides: Partial<Arc> = {}): Arc => ({
  id: 'arc-1',
  name: 'Creative Entrepreneur',
  narrative:
    'I want to build ventures that are principled, thoughtful, and genuinely helpful. I want to choose one idea long enough to make it real.',
  status: 'active',
  createdAt: '2026-05-06T00:00:00.000Z',
  updatedAt: '2026-05-06T00:00:00.000Z',
  ...overrides,
});

describe('arcGuidance', () => {
  test('buildLocalArcGuideFallback returns a complete guide for venture-like arcs', () => {
    const guide = buildLocalArcGuideFallback(makeArc(), []);

    expect(guide.identity?.statement).toMatch(/^You are becoming someone who/i);
    expect(guide.practice?.name).toBe('Weekly build-and-share');
    expect(guide.howThisShowsUp?.length).toBeGreaterThanOrEqual(3);
    expect(guide.shape?.whereItGetsHard).toMatch(/middle stretch/i);
    expect(guide.whenThisGetsHard?.nextBestMove).toMatch(/smallest useful improvement/i);
    expect(guide.guideVersion).toBe(1);
  });

  test('hasArcGuide returns true for a fully populated guide payload', () => {
    const arc = {
      ...makeArc(),
      ...buildLocalArcGuideFallback(makeArc(), []),
    };

    expect(hasArcGuide(arc)).toBe(true);
  });

  test('hasArcGuide returns false when required guide sections are missing', () => {
    expect(hasArcGuide(makeArc())).toBe(false);
  });
});
