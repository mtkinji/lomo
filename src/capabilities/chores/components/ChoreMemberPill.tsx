import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../../../theme';
import { Icon } from '../../../ui/Icon';
import { ProfileAvatar } from '../../../ui/ProfileAvatar';
import { Text } from '../../../ui/primitives';

export function ChoreMemberPill({
  name,
  accessibilityLabel = name,
  kind = 'member',
  size = 'default',
  accessible = true,
  testID,
}: {
  name: string;
  accessibilityLabel?: string;
  kind?: 'member' | 'household';
  size?: 'default' | 'compact';
  accessible?: boolean;
  testID?: string;
}) {
  const compact = size === 'compact';
  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessible ? accessibilityLabel : undefined}
      testID={testID}
      style={[styles.pill, compact && styles.compactPill]}
    >
      {kind === 'household' ? (
        <View style={[styles.householdMark, compact && styles.compactHouseholdMark]}>
          <Icon
            name="home"
            size={compact ? 13 : 16}
            color={colors.pine800} // @kwilt-brand-moment: household identity uses the requested Kwilt pine mark.
            testID={testID ? `${testID}.icon` : undefined}
          />
        </View>
      ) : (
        <ProfileAvatar name={name} size={compact ? 20 : 28} />
      )}
      <Text
        variant={compact ? 'bodySm' : 'label'}
        tone={compact ? 'secondary' : 'default'}
        style={compact ? styles.compactLabel : undefined}
      >
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.xs,
    paddingRight: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.gray100,
  },
  compactPill: {
    minHeight: 24,
    gap: spacing.xs,
    paddingLeft: 3,
    paddingRight: spacing.sm,
  },
  compactLabel: { fontSize: 12, lineHeight: 16 },
  householdMark: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.pine100, // @kwilt-brand-moment: household identity uses the requested Kwilt pine surface.
  },
  compactHouseholdMark: { width: 20, height: 20 },
});
