import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootDrawerParamList } from './RootNavigator';

/**
 * Navigation container ref used for global navigation (e.g. notifications).
 *
 * IMPORTANT: Keep this in a standalone module to avoid require-cycles like:
 * RootNavigator -> SomeScreen -> RootNavigator.
 */
export const rootNavigationRef = createNavigationContainerRef<RootDrawerParamList>();


