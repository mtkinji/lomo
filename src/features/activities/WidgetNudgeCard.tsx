import React from 'react';
import { Pressable } from 'react-native';
import { VStack, HStack, Text } from '../../ui/primitives';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { ButtonLabel } from '../../ui/Typography';
import { Icon } from '../../ui/Icon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { styles } from './activitiesScreenStyles';

export type WidgetNudgeCardProps = {
  widgetCopyVariant: string;
  onDismiss: () => void;
  onSetup: () => void;
};

export function WidgetNudgeCard({
  widgetCopyVariant,
  onDismiss,
  onSetup,
}: WidgetNudgeCardProps) {
  return (
    <Card style={styles.widgetNudgeCard}>
      <HStack justifyContent="space-between" alignItems="flex-start" space="sm">
        <VStack flex={1} space="xs">
          <HStack alignItems="center" space="xs">
            <Icon name="home" size={16} color={colors.textPrimary} />
            <Text style={styles.widgetNudgeTitle}>Add a Kwilt widget</Text>
          </HStack>
          <Text style={styles.widgetNudgeBody}>
            {widgetCopyVariant === 'start_focus_faster'
              ? 'Start Focus with fewer taps.'
              : 'See Today at a glance and jump in faster.'}
          </Text>
        </VStack>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss widget prompt"
          hitSlop={10}
          onPress={onDismiss}
        >
          <Icon name="close" size={16} color={colors.textSecondary} />
        </Pressable>
      </HStack>
      <HStack justifyContent="flex-end" alignItems="center" space="sm" style={{ marginTop: spacing.sm }}>
        <Button variant="secondary" size="sm" onPress={onSetup}>
          <ButtonLabel size="sm">Set up widget</ButtonLabel>
        </Button>
      </HStack>
    </Card>
  );
}

export type WidgetNudgeModalContentProps = {
  widgetCopyVariant: string;
  onDismiss: () => void;
  onSetup: () => void;
};

/**
 * Content for the widget nudge modal dialog.
 * This component renders the dialog content - the Dialog wrapper is in the parent.
 */
export function WidgetNudgeModalContent({
  onDismiss,
  onSetup,
}: WidgetNudgeModalContentProps) {
  return (
    <>
      <Text style={styles.widgetModalBody}>
        After you add it, tapping the widget should open Kwilt directly to Today or your next Activity.
      </Text>
      <HStack justifyContent="space-between" alignItems="center">
        <Button variant="secondary" onPress={onDismiss}>
          <ButtonLabel>Maybe later</ButtonLabel>
        </Button>
        <Button onPress={onSetup}>
          <ButtonLabel tone="inverse">Set up widget</ButtonLabel>
        </Button>
      </HStack>
    </>
  );
}

