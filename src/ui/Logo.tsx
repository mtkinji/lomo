import { Image } from 'react-native';
import { colors } from '../theme/colors';

type LogoProps = {
  size?: number;
  /**
   * Optional override for the logo tint color. When omitted, uses the
   * brand accent Pine green.
   */
  color?: string;
};

/**
 * Primary Kwilt logo mark, rendered from the app icon asset.
 *
 * We use a raster app icon here instead of the original SVG path to avoid
 * depending on native SVG support in development. This keeps the FAB and
 * other brand surfaces stable across platforms.
 */
export function Logo({ size = 32, color }: LogoProps) {
  return (
    <Image
      source={require('../../assets/icon.png')}
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        tintColor: color ?? colors.accent,
      }}
      resizeMode="contain"
      accessibilityRole="image"
      accessible
      accessibilityLabel="Kwilt"
    />
  );
}


