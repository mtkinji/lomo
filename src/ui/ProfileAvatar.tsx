import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '../theme';

export interface ProfileAvatarProps {
  /**
   * Full display name for the user. Used to derive initials and to pick
   * a deterministic gradient palette.
   */
  name?: string;
  /**
   * Optional remote avatar URL. When provided, the image is rendered on top
   * of the gradient; when omitted, we fall back to initials-only.
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

const GRADIENT_PALETTES: [string, string][] = [
  // Pine → Indigo
  [colors.pine400, colors.indigo400],
  // Pine → Turmeric
  [colors.pine500, colors.turmeric],
  // Indigo → Madder
  [colors.indigo500, colors.madder],
  // Moss → Clay
  [colors.moss, colors.clay],
];

const getInitials = (name?: string): string => {
  if (!name) {
    return 'KW';
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'KW';
  }
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || 'KW';
};

const getGradientForName = (name?: string): [string, string] => {
  if (!name) {
    return GRADIENT_PALETTES[0];
  }
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    // Simple deterministic hash; stable across sessions.
    hash = (hash + name.charCodeAt(i) * 17) % 997;
  }
  const index = hash % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index];
};

export function ProfileAvatar({
  name,
  avatarUrl,
  size = 36,
  borderRadius,
  style,
}: ProfileAvatarProps) {
  const initials = getInitials(name);
  const [startColor, endColor] = getGradientForName(name);
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
    <LinearGradient
      colors={[startColor, endColor]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
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
      <Text
        style={[
          styles.initials,
          {
            fontSize: initialsFontSize,
            lineHeight: initialsFontSize,
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {initials}
      </Text>
    </LinearGradient>
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
    color: colors.canvas,
    fontFamily: typography.titleSm.fontFamily,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
