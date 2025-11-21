import { useEffect, useState } from 'react';
import { BackHandler, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../ui/Icon';
import { colors, spacing, typography } from '../../theme';
import { useFirstTimeUxStore } from '../../store/useFirstTimeUxStore';
import { useAppStore } from '../../store/useAppStore';
import { AgentWorkspace } from '../ai/AgentWorkspace';
import { AppShell } from '../../ui/layout/AppShell';
import { Button } from '../../ui/Button';
import {
  FIRST_TIME_ONBOARDING_WORKFLOW_ID,
  FIRST_TIME_ONBOARDING_WORKFLOW_V2_ID,
} from '../../domain/workflows';

export function FirstTimeUxFlow() {
  const isVisible = useFirstTimeUxStore((state) => state.isFlowActive);
  const triggerCount = useFirstTimeUxStore((state) => state.triggerCount);
  const dismissFlow = useFirstTimeUxStore((state) => state.dismissFlow);
  const startFlow = useFirstTimeUxStore((state) => state.startFlow);
  const completeFlow = useFirstTimeUxStore((state) => state.completeFlow);
  const resetOnboardingAnswers = useAppStore((state) => state.resetOnboardingAnswers);
  const insets = useSafeAreaInsets();
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [useV2Workflow, setUseV2Workflow] = useState(false);

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

  const workspaceKey = `${useV2Workflow ? 'v2' : 'v1'}:${triggerCount}`;

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
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      resetOnboardingAnswers();
                      startFlow();
                      setUseV2Workflow(false);
                      setShowDevMenu(false);
                    }}
                    style={({ pressed }) => [
                      styles.devMenuItem,
                      pressed && styles.devMenuItemPressed,
                    ]}
                  >
                    <View style={styles.devMenuItemContent}>
                      <Icon name="refresh" size={16} color={colors.textPrimary} />
                      <Text style={styles.devMenuItemLabel}>Restart onboarding</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      resetOnboardingAnswers();
                      setUseV2Workflow(true);
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
                      setShowDevMenu(false);
                      dismissFlow();
                    }}
                    style={({ pressed }) => [
                      styles.devMenuItem,
                      pressed && styles.devMenuItemPressed,
                    ]}
                  >
                    <View style={styles.devMenuItemContent}>
                      <Icon name="close" size={16} color={colors.textPrimary} />
                      <Text style={styles.devMenuItemLabel}>Exit onboarding</Text>
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
            workflowDefinitionId={
              useV2Workflow ? FIRST_TIME_ONBOARDING_WORKFLOW_V2_ID : FIRST_TIME_ONBOARDING_WORKFLOW_ID
            }
            workflowInstanceId={workspaceKey}
            onComplete={() => {
              completeFlow();
              dismissFlow();
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
  },
  devMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  devMenu: {
    position: 'absolute',
    right: 12,
    borderRadius: 16,
    backgroundColor: colors.canvas,
    paddingVertical: 4,
    paddingHorizontal: 4,
    gap: 0,
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    zIndex: 2,
  },
  devMenuItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
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
});


