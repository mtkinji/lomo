import { rootNavigationRef } from '../../../navigation/rootNavigationRef';
import { resolveGamesHref, router } from './gamesRouter';

jest.mock('../../../navigation/rootNavigationRef', () => ({
  rootNavigationRef: {
    isReady: jest.fn(() => true),
    getRootState: jest.fn(),
    navigate: jest.fn(),
    dispatch: jest.fn(),
  },
}));

describe('Games router adapter', () => {
  it('falls back to navigation when replacing before root state exists', () => {
    jest.mocked(rootNavigationRef.getRootState).mockReturnValue(undefined);
    expect(() => router.replace('/timer')).not.toThrow();
    expect(rootNavigationRef.navigate).toHaveBeenCalledWith('Games', {
      screen: 'GamesTimer', params: undefined,
    });
    expect(rootNavigationRef.dispatch).not.toHaveBeenCalled();
  });

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
