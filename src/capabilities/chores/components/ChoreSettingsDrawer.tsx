import { StyleSheet, View } from 'react-native';
import { spacing } from '../../../theme';
import { BottomDrawer } from '../../../ui/BottomDrawer';
import { SettingsToggleRow } from '../../../ui/SettingsSurface';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Text } from '../../../ui/primitives';

type Props = {
  visible: boolean;
  tokensEnabled: boolean;
  onChangeTokens: (enabled: boolean) => void;
  onClose: () => void;
};

export function ChoreSettingsDrawer({ visible, tokensEnabled, onChangeTokens, onClose }: Props) {
  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['36%']}>
      <View testID="chores.settings.drawer" style={styles.content}>
        <BottomDrawerHeader
          variant="withClose"
          title="Chore settings"
          onClose={onClose}
          closeAccessibilityLabel="Close chore settings"
        />
        <SettingsToggleRow
          title="Use tokens"
          enabled={tokensEnabled}
          onPress={() => onChangeTokens(!tokensEnabled)}
        />
        <Text tone="secondary" style={styles.description}>
          Show optional rewards with chores. Chores still work the same when this is off.
        </Text>
      </View>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  description: {
    paddingHorizontal: spacing.md,
  },
});
