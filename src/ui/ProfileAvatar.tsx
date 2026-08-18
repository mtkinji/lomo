import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../theme';

export interface ProfileAvatarProps {
  /**
   * Full display name for the user. Used to derive initials and to pick
   * a deterministic brand palette.
   */
  name?: string;
  /**
   * Optional remote avatar URL. When provided, the image is rendered on top
   * of the fallback surface; when omitted, we fall back to initials-only.
   */
  avatarUrl?: string | null;
  /**
   * Size in logical pixels. Defaults to 36 (drawer avatar).
   */
  size?: number;
  /**
   * Optional explicit border radius. When omitted, we default to a circle.
   */
  borderRadius?: number;
  /**
   * Optional extra styles applied on the outer container.
   */
  style?: View['props']['style'];
}

const BRAND_PALETTES = [
  { backgroundColor: colors.pine100, textColor: colors.pine900 },
  { backgroundColor: colors.quiltBlue100, textColor: colors.quiltBlue900 },
  { backgroundColor: colors.turmeric100, textColor: colors.turmeric900 },
  { backgroundColor: colors.madder100, textColor: colors.madder900 },
];

const getInitials = (name?: string): string => {
  if (!name) {
    return 'KW';
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'KW';
  }
  const firstName = parts[0] ?? '';
  const initials = Array.from(firstName).slice(0, 2).join('').toLocaleUpperCase();
  return initials || 'KW';
};

const getBrandPaletteForName = (name?: string) => {
  if (!name) {
    return BRAND_PALETTES[0];
  }
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    // Simple deterministic hash; stable across sessions.
    hash = (hash + name.charCodeAt(i) * 17) % 997;
  }
  const index = hash % BRAND_PALETTES.length;
  return BRAND_PALETTES[index];
};

export function ProfileAvatar({
  name,
  avatarUrl,
  size = 36,
  borderRadius,
  style,
}: ProfileAvatarProps) {
  const initials = getInitials(name);
  const palette = getBrandPaletteForName(name);
  const radius = borderRadius ?? size / 2;
  const initialsFontSize = Math.max(10, Math.round(size * 0.38));

  if (avatarUrl) {
    return (
      <View
        style={[
          styles.avatarContainer,
          {
            width: size,
            height: size,
            borderRadius: radius,
          },
          style,
        ]}
      >
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: '100%', height: '100%', borderRadius: radius }}
        />
      </View>
    );
  }

  return (
    <View
      testID="profile-avatar-fallback"
      style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: palette.backgroundColor,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.initials,
          {
            fontSize: initialsFontSize,
            height: size,
            lineHeight: size,
            color: palette.textColor,
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    ...typography.bodySm,
    fontFamily: typography.titleSm.fontFamily,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    width: '100%',
  },
});
