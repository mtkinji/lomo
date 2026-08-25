import {
  getCapabilityMenuTiers,
  getCapabilityPinToastMessage,
  isCapabilityPinned,
  setCapabilityPinOverride,
} from './capabilityMenuPins';

describe('capability menu pins', () => {
  it('keeps the accepted default primary clusters and More destinations', () => {
    expect(getCapabilityMenuTiers({})).toEqual({
      primaryClusters: [
        ['money-summary', 'chores'],
        ['recipes', 'groceries'],
        ['todos', 'plan', 'goals'],
      ],
      moreCapabilityIds: ['arcs', 'chapters', 'games', 'explore'],
    });
  });

  it('pins occasional destinations after the default primary clusters', () => {
    expect(getCapabilityMenuTiers({ games: true, arcs: true })).toEqual({
      primaryClusters: [
        ['money-summary', 'chores'],
        ['recipes', 'groceries'],
        ['todos', 'plan', 'goals'],
        ['arcs', 'games'],
      ],
      moreCapabilityIds: ['chapters', 'explore'],
    });
  });

  it('moves unpinned defaults into More while retaining canonical order', () => {
    expect(getCapabilityMenuTiers({ chores: false, recipes: false })).toEqual({
      primaryClusters: [
        ['money-summary'],
        ['groceries'],
        ['todos', 'plan', 'goals'],
      ],
      moreCapabilityIds: ['chores', 'recipes', 'arcs', 'chapters', 'games', 'explore'],
    });
  });

  it('stores only deviations from the product defaults', () => {
    const unpinned = setCapabilityPinOverride({}, 'chores', false);
    expect(unpinned).toEqual({ chores: false });
    expect(isCapabilityPinned('chores', unpinned)).toBe(false);

    const restored = setCapabilityPinOverride(unpinned, 'chores', true);
    expect(restored).toEqual({});
    expect(isCapabilityPinned('chores', restored)).toBe(true);

    const pinned = setCapabilityPinOverride({}, 'games', true);
    expect(pinned).toEqual({ games: true });
    expect(isCapabilityPinned('games', pinned)).toBe(true);
  });

  it('uses a brief plain receipt for each pin change', () => {
    expect(getCapabilityPinToastMessage('Games', true)).toBe('Games pinned');
    expect(getCapabilityPinToastMessage('Chores', false)).toBe('Chores unpinned');
  });
});
