import { Image } from 'react-native';

type LogoProps = {
  size?: number;
};

const LOGO_SOURCE = require('../../assets/icon.png');

/**
 * Primary kwilt logo mark, rendered directly from the app icon asset.
 *
 * We use a raster app icon here instead of the original SVG path to avoid
 * depending on native SVG support in development. This keeps the FAB and
 * other brand surfaces stable across platforms.
 */
export function Logo({ size = 32 }: LogoProps) {
  return (
    <Image
      source={LOGO_SOURCE}
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        // We rely on the app icon artwork itself for color & composition.
        // Keeping this component as a thin wrapper around `Image` reduces
        // the chances of regressions (e.g., over-tinting) and makes the
        // logo render dependably anywhere it's used.
      }}
      resizeMode="contain"
      accessibilityRole="image"
      accessible
      accessibilityLabel="kwilt"
    />
  );
}
