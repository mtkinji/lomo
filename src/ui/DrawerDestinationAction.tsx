import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { ButtonLabel } from './Typography';

type Props = {
  label: string;
  leadingIcon: IconName;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  testID?: string;
};

/** One prominent navigation path from a drawer into its likely next workspace. */
export function DrawerDestinationAction({
  label,
  leadingIcon,
  onPress,
  accessibilityLabel = label,
  accessibilityHint,
  disabled,
  loading,
  loadingLabel,
  testID = 'drawer-destination-action',
}: Props) {
  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      loading={loading}
      loadingLabel={loadingLabel}
      onPress={onPress}
      size="md"
      testID={testID}
      fullWidth
    >
      <View style={styles.content}>
        <Icon
          testID={`${testID}.leading-icon`}
          name={leadingIcon}
          size={19}
          color={colors.primaryForeground}
        />
        <ButtonLabel tone="inverse" numberOfLines={1}>
          {label}
        </ButtonLabel>
      </View>
    </Button>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
