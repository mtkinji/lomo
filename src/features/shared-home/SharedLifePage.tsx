import { useAccessibilityPreferences } from "../../ui/hooks/useAccessibilityPreferences";
import { useContext, useEffect, useState } from "react";
import { NavigationContext } from "@react-navigation/native";
import type { ReactNode } from "react";
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { Button, Text } from "../../ui/primitives";
import { colors, spacing, typography } from "../../theme";
export function SharedLifePage({
  title,
  onClose,
  children,
  footer,
  visible = true,
  rightElement,
  moreMenu,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  visible?: boolean;
  rightElement?: ReactNode;
  moreMenu?: ReactNode;
}) {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);
  useEffect(() => {
    if (!navigation) return;
    const focus = navigation.addListener("focus", () => setFocused(true));
    const blur = navigation.addListener("blur", () => setFocused(false));
    return () => {
      focus();
      blur();
    };
  }, [navigation]);
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  return (
    <Modal
      visible={visible && focused}
      animationType={reduceMotionEnabled ? "none" : "slide"}
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
          <KeyboardAvoidingView
            style={styles.page}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.header}>
              <Button
                variant="ghost"
                size="icon"
                iconButtonSize={44}
                accessibilityLabel={`Close ${title}`}
                onPress={onClose}
              >
                ×
              </Button>
              {moreMenu ? <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                <Text style={typography.titleSm}>{title}</Text>{moreMenu}
              </View> : <Text style={styles.title}>{title}</Text>}
              {rightElement ?? <View style={styles.balance} />}
            </View>
            <View style={styles.page}>
              {children}
              {footer}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { ...typography.titleSm, flex: 1, textAlign: "center" },
  balance: { width: 44 },
});
