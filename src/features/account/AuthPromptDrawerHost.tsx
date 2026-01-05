import { StyleSheet, View } from 'react-native';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { VStack, Text, HStack } from '../../ui/primitives';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { colors, spacing, typography } from '../../theme';
import { signInWithProvider } from '../../services/backend/auth';
import { useAuthPromptStore, type AuthPromptReason } from '../../store/useAuthPromptStore';

function copyForReason(reason: AuthPromptReason): { title: string; body: string } {
  switch (reason) {
    case 'share_goal':
      return { title: 'Sign in to share', body: 'Sign in to share this goal with an invite link.' };
    case 'share_goal_email':
      return { title: 'Sign in to email', body: 'Sign in to email an invite link.' };
    case 'join_goal':
      return { title: 'Sign in to join', body: 'Sign in to join this shared goal.' };
    case 'claim_arc_draft':
      return {
        title: 'Sign in to continue',
        body: 'Sign in to claim your Arc draft and continue in the app.',
      };
    case 'upload_attachment':
      return { title: 'Sign in required', body: 'Sign in to upload attachments and keep access safe.' };
    case 'admin':
      return { title: 'Sign in required', body: 'Sign in to access Admin tools.' };
    case 'settings':
    default:
      return { title: 'Sign in required', body: 'Sign in to sync your account across devices and access sharing + admin tools.' };
  }
}

export function AuthPromptDrawerHost() {
  const visible = useAuthPromptStore((s) => s.visible);
  const reason = useAuthPromptStore((s) => s.reason);
  const busy = useAuthPromptStore((s) => s.busy);
  const close = useAuthPromptStore((s) => s.close);
  const setBusy = useAuthPromptStore((s) => s.setBusy);

  const titleAndBody = copyForReason(reason ?? 'settings');

  const resolveWithSession = (session: any) => {
    const deferred = useAuthPromptStore.getState().deferred;
    if (deferred) {
      try {
        deferred.resolve(session);
      } catch {
        // ignore
      }
    }
    close();
  };

  const reject = (err?: Error) => {
    close({ reject: true, error: err ?? new Error('Sign-in cancelled') });
  };

  return (
    <BottomDrawer
      visible={visible}
      onClose={() => {
        if (busy) return;
        reject(new Error('Sign-in cancelled'));
      }}
      snapPoints={['50%']}
      initialSnapIndex={0}
      dismissable={!busy}
      enableContentPanningGesture
      scrimToken="pineSubtle"
      sheetStyle={styles.sheet}
      handleContainerStyle={styles.handleContainer}
      handleStyle={styles.handle}
    >
      <View style={styles.content}>
        <VStack space="md">
          <VStack space="xs">
            <Text style={styles.title}>{titleAndBody.title}</Text>
            <Text style={styles.body}>{titleAndBody.body}</Text>
          </VStack>

          <VStack space="sm" style={styles.buttonGroup}>
            <Button
              fullWidth
              variant="outline"
              style={styles.outlineButton}
              disabled={busy}
              onPress={async () => {
                if (busy) return;
                setBusy(true);
                try {
                  const session = await signInWithProvider('apple');
                  resolveWithSession(session);
                } catch (e: any) {
                  reject(e instanceof Error ? e : new Error('Unable to sign in with Apple'));
                } finally {
                  setBusy(false);
                }
              }}
              accessibilityLabel="Continue with Apple"
            >
              <HStack alignItems="center" justifyContent="center" space="sm">
                <Icon name="apple" size={18} color={colors.textPrimary} />
                <Text style={styles.authButtonLabel}>Continue with Apple</Text>
              </HStack>
            </Button>

            <Button
              fullWidth
              variant="outline"
              style={styles.outlineButton}
              disabled={busy}
              onPress={async () => {
                if (busy) return;
                setBusy(true);
                try {
                  const session = await signInWithProvider('google');
                  resolveWithSession(session);
                } catch (e: any) {
                  reject(e instanceof Error ? e : new Error('Unable to sign in with Google'));
                } finally {
                  setBusy(false);
                }
              }}
              accessibilityLabel="Continue with Google"
            >
              <HStack alignItems="center" justifyContent="center" space="sm">
                <Icon name="google" size={18} color={colors.textPrimary} />
                <Text style={styles.authButtonLabel}>Continue with Google</Text>
              </HStack>
            </Button>

            <Button
              fullWidth
              variant="ghost"
              disabled={busy}
              onPress={() => reject(new Error('Sign-in cancelled'))}
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Button>
          </VStack>
        </VStack>
      </View>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleContainer: {
    paddingTop: spacing.sm,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    backgroundColor: colors.border,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  body: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  buttonGroup: {
    marginTop: spacing.sm,
  },
  outlineButton: {
    borderColor: colors.border,
  },
  authButtonLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  cancelLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
});


