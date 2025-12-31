import { StyleSheet, Text as RNText, View, type ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { ProfileAvatar } from './ProfileAvatar';

export type OverlappingAvatar = {
  id: string;
  name?: string | null;
  avatarUrl?: string | null;
};

export function OverlappingAvatarStack(props: {
  avatars: OverlappingAvatar[];
  size?: number;
  maxVisible?: number;
  overlapPx?: number;
  style?: ViewStyle;
}) {
  const size = typeof props.size === 'number' ? props.size : 22;
  const maxVisible = typeof props.maxVisible === 'number' ? props.maxVisible : 3;
  const overlapPx = typeof props.overlapPx === 'number' ? props.overlapPx : 10;

  const avatars = Array.isArray(props.avatars) ? props.avatars : [];
  const visible = avatars.slice(0, Math.max(0, maxVisible));
  const extra = Math.max(0, avatars.length - visible.length);

  return (
    <View style={[styles.row, props.style]}>
      {visible.map((a, idx) => (
        <View
          key={a.id}
          style={[
            styles.avatarWrap,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: idx === 0 ? 0 : -overlapPx,
            },
          ]}
        >
          <ProfileAvatar
            name={a.name ?? undefined}
            avatarUrl={a.avatarUrl ?? undefined}
            size={size}
            borderRadius={size / 2}
          />
        </View>
      ))}
      {extra > 0 ? <RNText style={styles.moreLabel}>+{extra}</RNText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    borderWidth: 1,
    borderColor: colors.canvas,
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
  },
  moreLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
});


