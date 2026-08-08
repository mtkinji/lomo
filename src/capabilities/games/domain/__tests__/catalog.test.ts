import { basicDiceUtility, catalogForRelease, gameCatalog } from '../catalog';

describe('game catalog', () => {
  it('contains twelve unique shared games in development', () => {
    expect(gameCatalog).toHaveLength(12);
    expect(new Set(gameCatalog.map((game) => game.id)).size).toBe(12);
    expect(gameCatalog.every((game) => game.minPlayers >= 2)).toBe(true);
  });

  it('keeps Bank and Farkle on Tumble and routes nine connection games separately', () => {
    expect(gameCatalog.filter((game) => game.route.kind === 'tumble').map((game) => game.id)).toEqual(['bank', 'farkle']);
    expect(gameCatalog.filter((game) => game.route.kind === 'connection')).toHaveLength(9);
  });

  it('keeps Stitch Five in Workshop on its own local route', () => {
    expect(gameCatalog.find((game) => game.id === 'stitch-five')).toMatchObject({
      title: 'Stitch Five',
      minPlayers: 2,
      maxPlayers: 4,
      route: { kind: 'stitch-five' },
      releaseStatus: 'learning',
    });
    expect(catalogForRelease(false).map((game) => game.id)).not.toContain('stitch-five');
  });

  it('defines Basic Dice Roller as a utility rather than a game', () => {
    expect(basicDiceUtility.title).toBe('Basic Dice Roller');
    expect(gameCatalog.map((game) => String(game.id))).not.toContain('roller');
    expect(basicDiceUtility.route).toEqual({ kind: 'tumble', mode: 'roller' });
  });

  it('replaces Same Page with player-aware Oddball without expanding the shelf', () => {
    expect(gameCatalog.find((game) => game.id === 'same-page')).toMatchObject({ title: 'Oddball', minPlayers: 3, maxPlayers: 8 });
    expect(gameCatalog.map((game) => game.title)).not.toContain('Same Page');
    expect(gameCatalog.map((game) => game.title)).not.toContain('One Plan');
    expect(gameCatalog.map((game) => game.title)).not.toContain('Show of Hands');
  });

  it('adds Slanguage as a three-to-eight-phone game', () => {
    expect(gameCatalog.find((game) => game.id === 'slanguage')).toMatchObject({
      title: 'Slanguage', minPlayers: 3, maxPlayers: 8, promise: 'Remix one sentence. Funniest wins.',
    });
  });

  it('keeps the rebuilt Story Relay in playtest until a real family table proves it', () => {
    expect(gameCatalog.find((game) => game.id === 'story-relay')).toMatchObject({
      promise: 'Face one wild story together.',
      durationMinutes: [15, 25],
      releaseStatus: 'playtest',
    });
  });

  it('keeps the 2.0 production shelf narrower than the playtest inventory', () => {
    const production = catalogForRelease(false);
    const workshop = catalogForRelease(true).filter((game) => game.releaseStatus !== 'ready');

    expect(production.map((game) => game.id)).toEqual([
      'bank', 'farkle', 'same-page', 'family-forecast',
      'pass-pattern', 'doodle-bridge',
    ]);
    expect(workshop.map((game) => game.id)).toEqual(['common-thread', 'object-quest', 'story-relay', 'clue-circle', 'slanguage', 'stitch-five']);
    expect(gameCatalog.every((game) => game.durationMinutes[0] > 0 && game.energy.length > 0)).toBe(true);
  });
});
