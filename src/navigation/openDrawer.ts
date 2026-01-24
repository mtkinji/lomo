import { DrawerActions, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { rootNavigationRef } from './rootNavigationRef';

export function openRootDrawer(navigation?: NavigationProp<ParamListBase>) {
  if (navigation) {
    let parent: NavigationProp<ParamListBase> | undefined = navigation;
    while (parent) {
      const state = parent.getState?.();
      if (state?.type === 'drawer') {
        parent.dispatch(DrawerActions.openDrawer());
        return;
      }
      parent = parent.getParent?.();
    }
  }

  if (rootNavigationRef.isReady()) {
    rootNavigationRef.dispatch(DrawerActions.openDrawer());
  }
}

