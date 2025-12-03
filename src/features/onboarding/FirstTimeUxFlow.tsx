import { useEffect, useState } from 'react';
import { BackHandler, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../ui/Icon';
import { colors, spacing, typography } from '../../theme';
import { useFirstTimeUxStore } from '../../store/useFirstTimeUxStore';
import { useAppStore } from '../../store/useAppStore';
import { rootNavigationRef } from '../../navigation/RootNavigator';
import { AgentWorkspace } from '../ai/AgentWorkspace';
import { AppShell } from '../../ui/layout/AppShell';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/primitives';
import {
  FIRST_TIME_ONBOARDING_WORKFLOW_V2_ID,
} from '../../domain/workflows';

export function FirstTimeUxFlow() {
  const isVisible = useFirstTimeUxStore((state) => state.isFlowActive);
  const triggerCount = useFirstTimeUxStore((state) => state.triggerCount);
  const dismissFlow = useFirstTimeUxStore((state) => state.dismissFlow);
  const startFlow = useFirstTimeUxStore((state) => state.startFlow);
  const completeFlow = useFirstTimeUxStore((state) => state.completeFlow);
  const requestDevAutoCompleteToAvatar = useFirstTimeUxStore(
    (state) => state.requestDevAutoCompleteToAvatar
  );
  const resetOnboardingAnswers = useAppStore((state) => state.resetOnboardingAnswers);
  const lastOnboardingGoalId = useAppStore((state) => state.lastOnboardingGoalId);
  const insets = useSafeAreaInsets();
  const [showDevMenu, setShowDevMenu] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  const workspaceKey = `v2:${triggerCount}`;

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        {__DEV__ && (
          <>
            <View style={[styles.devExitRow, { top: insets.top + 8 }]}>
              <Button
                variant="accent"
                size="icon"
                iconButtonSize={28}
                onPress={() => setShowDevMenu((prev) => !prev)}
                accessibilityLabel="Dev tools menu"
                style={styles.devExitButton}
              >
                <Icon name="dev" color={colors.canvas} size={16} />
              </Button>
            </View>
            {showDevMenu && (
              <>
                <Pressable style={styles.devMenuOverlay} onPress={() => setShowDevMenu(false)} />
                <View style={[styles.devMenu, { top: insets.top + 44 }]}>
                  <View style={styles.devMenuHeader}>
                    <Text style={styles.devMenuHeaderTitle}>Onboarding</Text>
                    <Text style={styles.devMenuHeaderSubtitle}>Developer tools</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      resetOnboardingAnswers();
                      startFlow();
                      setShowDevMenu(false);
                    }}
                    style={({ pressed }) => [
                      styles.devMenuItem,
                      pressed && styles.devMenuItemPressed,
                    ]}
                  >
                    <View style={styles.devMenuItemContent}>
                      <Icon name="refresh" size={16} color={colors.textPrimary} />
                      <Text style={styles.devMenuItemLabel}>Restart onboarding (v2 workflow)</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      resetOnboardingAnswers();
                      requestDevAutoCompleteToAvatar();
                      startFlow();
                      setShowDevMenu(false);
                    }}
                    style={({ pressed }) => [
                      styles.devMenuItem,
                      pressed && styles.devMenuItemPressed,
                    ]}
                  >
                    <View style={styles.devMenuItemContent}>
                      <Icon name="refresh" size={16} color={colors.textPrimary} />
                      <Text style={styles.devMenuItemLabel}>Autofill and skip to last step</Text>
                    </View>
                  </Pressable>
                  <View style={styles.devMenuSeparator} />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setShowDevMenu(false);
                      dismissFlow();
                    }}
                    style={({ pressed }) => [
                      styles.devMenuItem,
                      pressed && styles.devMenuItemPressed,
                    ]}
                  >
                    <View style={styles.devMenuItemContent}>
                      <Icon name="close" size={16} color={colors.destructive} />
                      <Text style={styles.devMenuDestructiveLabel}>Exit onboarding</Text>
                    </View>
                  </Pressable>
                </View>
              </>
            )}
          </>
        )}
        <AppShell>
          <AgentWorkspace
            key={workspaceKey}
            mode="firstTimeOnboarding"
            launchContext={{
              source: 'firstTimeAppOpen',
              intent: 'firstTimeOnboarding',
            }}
            workflowDefinitionId={FIRST_TIME_ONBOARDING_WORKFLOW_V2_ID}
            workflowInstanceId={workspaceKey}
            onComplete={() => {
              completeFlow();
              dismissFlow();
              const goalId = useAppStore.getState().lastOnboardingGoalId;
              if (goalId && rootNavigationRef.isReady()) {
                rootNavigationRef.navigate('ArcsStack', {
                  screen: 'GoalDetail',
                  params: { goalId, entryPoint: 'arcsStack' },
                });
              }
            }}
          />
        </AppShell>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.shell,
  },
  devExitRow: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
  },
  devExitButton: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  devMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  devMenu: {
    position: 'absolute',
    right: 12,
    borderRadius: 8,
    backgroundColor: colors.canvas,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 224,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 2,
  },
  devMenuHeader: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  devMenuHeaderTitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  devMenuHeaderSubtitle: {
    ...typography.bodyXs,
    color: colors.muted,
  },
  devMenuItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 6,
    minHeight: 44,
  },
  devMenuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  devMenuItemPressed: {
    backgroundColor: colors.shell,
  },
  devMenuItemLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  devMenuSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
    marginHorizontal: 0,
  },
  devMenuDestructiveLabel: {
    ...typography.body,
    color: colors.destructive,
  },
});


