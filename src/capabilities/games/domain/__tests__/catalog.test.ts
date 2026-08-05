import { basicDiceUtility, catalogForRelease, gameCatalog } from '../catalog';

describe('game catalog', () => {
  it('contains eleven unique shared games', () => {
    expect(gameCatalog).toHaveLength(11);
    expect(new Set(gameCatalog.map((game) => game.id)).size).toBe(11);
    expect(gameCatalog.every((game) => game.minPlayers >= 2)).toBe(true);
  });

  it('keeps Bank and Farkle on Tumble and routes nine connection games separately', () => {
    expect(gameCatalog.filter((game) => game.route.kind === 'tumble').map((game) => game.id)).toEqual(['bank', 'farkle']);
    expect(gameCatalog.filter((game) => game.route.kind === 'connection')).toHaveLength(9);
  });

  it('defines Basic Dice Roller as a utility rather than a game', () => {
    expect(basicDiceUtility.title).toBe('Basic Dice Roller');
    expect(gameCatalog.map((game) => String(game.id))).not.toContain('roller');
    expect(basicDiceUtility.route).toEqual({ kind: 'tumble', mode: 'roller' });
  });

  it('replaces Same Page with Show of Hands without expanding the shelf', () => {
    expect(gameCatalog.find((game) => game.id === 'same-page')).toMatchObject({ title: 'Show of Hands' });
    expect(gameCatalog.map((game) => game.title)).not.toContain('Same Page');
    expect(gameCatalog.map((game) => game.title)).not.toContain('One Plan');
  });

  it('adds Slanguage as a three-to-eight-phone game', () => {
    expect(gameCatalog.find((game) => game.id === 'slanguage')).toMatchObject({
      title: 'Slanguage', minPlayers: 3, maxPlayers: 8, promise: 'Remix one sentence. Funniest wins.',
    });
  });

  it('keeps the 2.0 production shelf narrower than the playtest inventory', () => {
    const production = catalogForRelease(false);
    const workshop = catalogForRelease(true).filter((game) => game.releaseStatus !== 'ready');

    expect(production.map((game) => game.id)).toEqual([
      'bank', 'farkle', 'same-page', 'story-relay', 'family-forecast',
      'pass-pattern', 'doodle-bridge',
    ]);
    expect(workshop.map((game) => game.id)).toEqual(['common-thread', 'object-quest', 'clue-circle', 'slanguage']);
    expect(gameCatalog.every((game) => game.durationMinutes[0] > 0 && game.energy.length > 0)).toBe(true);
  });
});
