import { Easing as NativeEasing } from 'react-native';
import { Easing as ReanimatedEasing } from 'react-native-reanimated';

export const INVENTORY_CHROME_ANIMATION_MS = 260;
export const inventoryChromeNativeEasing = NativeEasing.out(NativeEasing.cubic);
export const inventoryChromeReanimatedEasing = ReanimatedEasing.out(ReanimatedEasing.cubic);
