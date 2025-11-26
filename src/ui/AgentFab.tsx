import { ReactNode } from 'react';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { Icon } from './Icon';

export interface AgentFabProps {
  onPress: () => void;
  label?: string;
  iconName?: ReactNode;
}

export function AgentFab({ onPress, label = 'Ask LOMO', iconName }: AgentFabProps) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={styles.contentRow}>
          {iconName ? (
            iconName
          ) : (
            <Icon name="sparkles" size={18} color={colors.primaryForeground} />
          )}
          <Text style={styles.label}>{label}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
  },
  button: {
    borderRadius: 999,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  label: {
    ...typography.bodySm,
    color: colors.primaryForeground,
  },
});


