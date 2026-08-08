import { resolveGamesHref } from './gamesRouter';

describe('Games router adapter', () => {
  it.each([
    ['/', { screen: 'GamesShelf' }],
    ['/timer', { screen: 'GamesTimer' }],
    ['/hourglass', { screen: 'GamesTimer' }],
    ['/stitch-five', { screen: 'GamesStitchFive' }],
    ['/play/common-thread', { screen: 'GamesConnection', params: { gameId: 'common-thread' } }],
    ['/join/ABCD', { screen: 'GamesJoin', params: { token: 'ABCD' } }],
    ['/room/room-1', { screen: 'GamesRemote', params: { sessionId: 'room-1' } }],
  ] as const)('maps %s into the Games native stack', (href, expected) => {
    expect(resolveGamesHref(href)).toEqual(expected);
  });

  it('preserves object params for tumble and remote routes', () => {
    expect(resolveGamesHref({ pathname: '/tumble', params: { mode: 'farkle' } })).toEqual({
      screen: 'GamesTumble',
      params: { mode: 'farkle' },
    });
    expect(resolveGamesHref({ pathname: '/room/[sessionId]', params: { sessionId: 'room-2', hostUserId: 'host-1' } })).toEqual({
      screen: 'GamesRemote',
      params: { sessionId: 'room-2', hostUserId: 'host-1' },
    });
  });
});
