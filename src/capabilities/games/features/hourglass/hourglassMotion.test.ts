import { advancePhysicalFlip, classifyHourglassEnd, createPhysicalFlipState, PHYSICAL_END_STABLE_MS } from './hourglassMotion';

describe('hourglass physical motion', () => {
  it('classifies only clearly upright or inverted gravity', () => {
    expect(classifyHourglassEnd(-9.1)).toBe('upright');
    expect(classifyHourglassEnd(8.8)).toBe('inverted');
    expect(classifyHourglassEnd(3.2)).toBeNull();
  });

  it('arms after one end remains stable, then flips only after the opposite end is stable', () => {
    let state = createPhysicalFlipState();
    let result = advancePhysicalFlip(state, -9, 1_000);
    state = result.state;
    expect(result.flippedTo).toBeNull();

    result = advancePhysicalFlip(state, -9, 1_000 + PHYSICAL_END_STABLE_MS);
    state = result.state;
    expect(state.armedEnd).toBe('upright');
    expect(result.flippedTo).toBeNull();

    result = advancePhysicalFlip(state, 9, 2_000);
    state = result.state;
    expect(result.flippedTo).toBeNull();

    result = advancePhysicalFlip(state, 9, 2_000 + PHYSICAL_END_STABLE_MS);
    expect(result.state.armedEnd).toBe('inverted');
    expect(result.flippedTo).toBe('inverted');
  });

  it('clears a noisy candidate without losing the armed end', () => {
    let state = createPhysicalFlipState();
    state = advancePhysicalFlip(state, -9, 1_000).state;
    state = advancePhysicalFlip(state, -9, 1_000 + PHYSICAL_END_STABLE_MS).state;
    state = advancePhysicalFlip(state, 8, 2_000).state;

    const result = advancePhysicalFlip(state, 0.5, 2_050);

    expect(result.state.armedEnd).toBe('upright');
    expect(result.state.candidateEnd).toBeNull();
    expect(result.flippedTo).toBeNull();
  });
});
