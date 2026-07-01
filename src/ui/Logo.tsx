import { Image, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { SvgFromAsset } from './SvgFromAsset';

type LogoProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
  variant?: 'default' | 'white' | 'parchment';
};

const LOGO_MARK_SOURCE = require('../../assets/logo.svg');
const LOGO_WHITE_SOURCE = require('../../assets/logo-white.png');
const LOGO_PARCHMENT_SOURCE = require('../../assets/logo-parchment.png');

/**
 * Primary Kwilt logo mark. The default variant is the standalone green brand
 * mark; white/parchment variants are raster assets for saturated backgrounds.
 */
export function Logo({ size = 32, variant = 'default', style }: LogoProps) {
  if (variant === 'default') {
    return (
      <SvgFromAsset
        source={LOGO_MARK_SOURCE}
        width={size}
        height={size}
        color={colors.pine700}
        style={style as StyleProp<ViewStyle>}
        accessibilityLabel="Kwilt"
      />
    );
  }

  const source = variant === 'parchment' ? LOGO_PARCHMENT_SOURCE : LOGO_WHITE_SOURCE;
  return (
    <Image
      source={source}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 4,
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
