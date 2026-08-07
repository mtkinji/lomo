import * as ScreenOrientation from 'expo-screen-orientation';

export function applyNavigationOrientation(routeName: string | undefined) {
  return routeName === 'Food' || routeName === 'RecipeCookMode'
    ? ScreenOrientation.unlockAsync()
    : ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
}
