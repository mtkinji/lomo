import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import type { MoneyPlaceEntryParams } from './types';

export function getMoneyPlaceScreenOptions(
  params: MoneyPlaceEntryParams | undefined,
): NativeStackNavigationOptions {
  return params?.entryTransition === 'none'
    ? { animation: 'none' }
    : {};
}
