import { defaultForceLevels, getCanonicalForce } from './useAppStore';

const CANONICAL_FORCE_IDS = [
  'force-activity',
  'force-connection',
  'force-mastery',
  'force-spirituality',
];

describe('getCanonicalForce', () => {
  CANONICAL_FORCE_IDS.forEach((id) => {
    it(`returns the canonical Force record for ${id}`, () => {
      const force = getCanonicalForce(id);
      expect(force).toBeDefined();
      expect(force?.id).toBe(id);
      expect(force?.kind).toBe('canonical');
      expect(force?.isActive).toBe(true);
      expect(typeof force?.name).toBe('string');
    });
  });

  it('returns undefined for an unknown force id', () => {
    expect(getCanonicalForce('force-unknown')).toBeUndefined();
  });
});

describe('defaultForceLevels', () => {
  it('returns a level entry for every canonical force id', () => {
    const levels = defaultForceLevels();
    expect(Object.keys(levels).sort()).toEqual([...CANONICAL_FORCE_IDS].sort());
  });

  it('defaults all levels to 0 when no level is provided', () => {
    const levels = defaultForceLevels();
    Object.values(levels).forEach((level) => expect(level).toBe(0));
  });

  it('honors a custom default level (1, 2, 3)', () => {
    const levels = defaultForceLevels(2);
    Object.values(levels).forEach((level) => expect(level).toBe(2));
  });

  it('returns a fresh object that is safe to mutate per call', () => {
    const a = defaultForceLevels();
    a['force-activity'] = 3;
    const b = defaultForceLevels();
    expect(b['force-activity']).toBe(0);
  });
});
