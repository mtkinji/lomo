import { Platform } from 'react-native';
import {
  fonts,
  monoFontCandidates,
  typography as baseTypography,
} from '@kwilt/tokens/typography';

const monoFontFamily = Platform.select(monoFontCandidates) ?? 'monospace';

export { fonts };

export const typography = {
  ...baseTypography,
  mono: {
    ...baseTypography.mono,
    fontFamily: monoFontFamily,
  },
};
