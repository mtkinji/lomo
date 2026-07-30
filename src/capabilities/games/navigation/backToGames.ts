type BackNavigation = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: '/') => void;
};

export function backToGames(navigation: BackNavigation) {
  if (navigation.canGoBack()) {
    navigation.back();
    return;
  }

  navigation.replace('/');
}
