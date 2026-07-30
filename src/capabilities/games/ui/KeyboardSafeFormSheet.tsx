import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from './GameButton';

type PrimaryAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

type Props = {
  visible: boolean;
  eyebrow?: string;
  title: string;
  onClose: () => void;
  primaryAction: PrimaryAction;
  children: ReactNode;
};

export function KeyboardSafeFormSheet({ visible, eyebrow, title, onClose, primaryAction, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.avoider}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.heading}>
              <View style={styles.headingCopy}>
                {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                <Text style={styles.title}>{title}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close player editor" onPress={onClose} style={styles.close}>
                <X size={19} color={gamesTheme.colors.ink} />
              </Pressable>
            </View>

            <ScrollView
              testID="keyboard-safe-form-body"
              automaticallyAdjustKeyboardInsets
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.body}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>

            <View testID="keyboard-safe-form-footer" style={styles.footer}>
              <GameButton disabled={primaryAction.disabled} onPress={primaryAction.onPress}>
                {primaryAction.label}
              </GameButton>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avoider: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(20,17,13,0.62)',
  },
  sheet: {
    maxHeight: '92%',
    overflow: 'hidden',
    borderRadius: gamesTheme.radius.lg,
    backgroundColor: gamesTheme.colors.paper,
  },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 12,
  },
  headingCopy: { flex: 1 },
  eyebrow: {
    fontFamily: gamesTheme.type.utility,
    color: gamesTheme.colors.danger,
    fontSize: 9,
    letterSpacing: 1.4,
  },
  title: { fontFamily: gamesTheme.type.display, color: gamesTheme.colors.ink, fontSize: 26 },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32,29,24,0.07)',
  },
  body: { gap: 14, paddingHorizontal: 22, paddingBottom: 14 },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(32,29,24,0.12)',
    backgroundColor: gamesTheme.colors.paper,
  },
});
