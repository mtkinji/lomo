import { StackActions, useRoute } from '@react-navigation/native';
import { rootNavigationRef } from '../../../navigation/rootNavigationRef';
import type { GamesStackParamList } from './types';

export type Href = string | { pathname: string; params?: Record<string, unknown> };

function destinationFor(href: Href): { screen: keyof GamesStackParamList; params?: Record<string, unknown> } {
  const pathname = typeof href === 'string' ? href : href.pathname;
  const params = typeof href === 'string' ? undefined : href.params;

  if (pathname === '/' || pathname === '/games') return { screen: 'GamesShelf' };
  if (pathname === '/auth') return { screen: 'GamesAccount', params };
  if (pathname === '/join') return { screen: 'GamesJoin', params };
  if (pathname === '/timer' || pathname === '/hourglass') return { screen: 'GamesTimer', params };
  if (pathname === '/stitch-five') return { screen: 'GamesStitchFive', params };
  if (pathname === '/tumble') return { screen: 'GamesTumble', params };
  if (pathname === '/play/[gameId]') return { screen: 'GamesConnection', params };
  if (pathname === '/room/[sessionId]') return { screen: 'GamesRemote', params };
  if (pathname.startsWith('/play/')) return { screen: 'GamesConnection', params: { gameId: pathname.slice('/play/'.length) } };
  if (pathname.startsWith('/join/')) return { screen: 'GamesJoin', params: { token: pathname.slice('/join/'.length) } };
  if (pathname.startsWith('/room/')) return { screen: 'GamesRemote', params: { sessionId: pathname.slice('/room/'.length) } };
  return { screen: 'GamesShelf' };
}

function navigate(href: Href) {
  if (!rootNavigationRef.isReady()) return;
  const destination = destinationFor(href);
  rootNavigationRef.navigate('Games', {
    screen: destination.screen,
    params: destination.params,
  } as never);
}

function replace(href: Href) {
  if (!rootNavigationRef.isReady()) return;
  const destination = destinationFor(href);
  const gamesRoute = rootNavigationRef.getRootState().routes.find((route) => route.name === 'Games');
  const target = gamesRoute?.state?.key;
  if (!target) {
    navigate(href);
    return;
  }
  rootNavigationRef.dispatch({
    ...StackActions.replace(destination.screen, destination.params),
    target,
  });
}

export const router = {
  push: (href: Href) => navigate(href),
  replace,
  back: () => {
    if (rootNavigationRef.isReady() && rootNavigationRef.canGoBack()) rootNavigationRef.goBack();
  },
  canGoBack: () => rootNavigationRef.isReady() && rootNavigationRef.canGoBack(),
};

export function useLocalSearchParams<T extends Record<string, unknown>>() {
  const route = useRoute();
  return ((route.params ?? {}) as unknown) as T;
}

export const resolveGamesHref = destinationFor;
