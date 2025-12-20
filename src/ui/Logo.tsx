import { Image, type ImageStyle, type StyleProp } from 'react-native';

type LogoProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
  variant?: 'default' | 'white' | 'parchment';
};

const LOGO_SOURCE = require('../../assets/icon.png');
const LOGO_WHITE_SOURCE = require('../../assets/logo-white.png');
const LOGO_PARCHMENT_SOURCE = require('../../assets/logo-parchment.png');

/**
 * Primary Kwilt logo mark, rendered directly from the app icon asset.
 *
 * We use a raster app icon here instead of the original SVG path to avoid
 * depending on native SVG support in development. This keeps the FAB and
 * other brand surfaces stable across platforms.
 */
export function Logo({ size = 32, variant = 'default', style }: LogoProps) {
  const source =
    variant === 'parchment'
      ? LOGO_PARCHMENT_SOURCE
      : variant === 'white'
        ? LOGO_WHITE_SOURCE
        : LOGO_SOURCE;
  return (
    <Image
      source={source}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 4,
          // We rely on the app icon artwork itself for color & composition.
          // Keeping this component as a thin wrapper around `Image` reduces
          // the chances of regressions (e.g., over-tinting) and makes the
          // logo render dependably anywhere it's used.
        },
        style,
      ]}
      resizeMode="contain"
      accessibilityRole="image"
      accessible
      accessibilityLabel="Kwilt"
    />
  );
}
