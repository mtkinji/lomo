import { useEffect, useState } from 'react';
import { BackHandler, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../ui/Icon';
import { colors, spacing, typography } from '../../theme';
import { useFirstTimeUxStore } from '../../store/useFirstTimeUxStore';
import { useAppStore } from '../../store/useAppStore';
import { AiChatPane } from '../ai/AiChatScreen';
import { AppShell } from '../../ui/layout/AppShell';
import { Button } from '../../ui/Button';

export function FirstTimeUxFlow() {
  const isVisible = useFirstTimeUxStore((state) => state.isFlowActive);
  const dismissFlow = useFirstTimeUxStore((state) => state.dismissFlow);
  const startFlow = useFirstTimeUxStore((state) => state.startFlow);
  const resetOnboardingAnswers = useAppStore((state) => state.resetOnboardingAnswers);
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
                <Icon name="menu" color={colors.canvas} size={14} />
              </Button>
            </View>
            {showDevMenu && (
              <>
                <Pressable style={styles.devMenuOverlay} onPress={() => setShowDevMenu(false)} />
                <View style={[styles.devMenu, { top: insets.top + 44 }]}>
                  <Button
                    variant="ghost"
                    size="small"
                    onPress={() => {
                      resetOnboardingAnswers();
                      startFlow();
                      setShowDevMenu(false);
                    }}
                  >
                    <Text style={styles.devMenuItemLabel}>Restart onboarding</Text>
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onPress={() => {
                      setShowDevMenu(false);
                      dismissFlow();
                    }}
                  >
                    <Text style={styles.devMenuItemLabel}>Exit onboarding</Text>
                  </Button>
                </View>
              </>
            )}
          </>
        )}
        <AppShell>
          <AiChatPane mode="firstTimeOnboarding" resumeDraft={false} />
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
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    zIndex: 2,
  },
  devMenuItemLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
});


