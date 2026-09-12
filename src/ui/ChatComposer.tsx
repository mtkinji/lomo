import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "../theme";
import { Pressable } from "./HapticPressable";
import { Icon } from "./Icon";
import { Input } from "./Input";
import { KwiltLoader } from "./KwiltLoader";
import { Text } from "./Typography";

const INPUT_MIN_HEIGHT = 34;
const INPUT_MAX_HEIGHT = 144;

export type ChatComposerHandle = {
  blur: () => void;
  focus: () => void;
};

export type ChatComposerSelection = {
  prompt: string;
  selectionStart: number;
  selectionEnd: number;
};

export type ChatComposerDictation = {
  state: "idle" | "connecting" | "recording" | "transcribing" | "error";
  elapsedSeconds: number;
  levels: number[];
  message?: string;
  canRetry?: boolean;
  onStart: (selection: ChatComposerSelection) => void;
  onStop: () => void;
  onCancel: () => void;
  onRetry: () => void;
};

export type ChatComposerProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  placeholder: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
  sendAccessibilityLabel?: string;
  disabled?: boolean;
  sendDisabled?: boolean;
  loading?: boolean;
  maxLength?: number;
  testID?: string;
  sendTestID?: string;
  onPressIn?: () => void;
  onFocus?: () => void;
  dictation?: ChatComposerDictation;
};

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Native counterpart to the compact-to-expanded Kwilt Chat composer. */
export const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(
  function ChatComposer(
    {
      value,
      onChangeText,
      onSend,
      placeholder,
      accessibilityLabel,
      accessibilityHint,
      sendAccessibilityLabel = "Send message",
      disabled = false,
      sendDisabled = false,
      loading = false,
      maxLength,
      testID,
      sendTestID,
      onPressIn,
      onFocus,
      dictation,
    },
    forwardedRef,
  ) {
    const inputRef = useRef<TextInput | null>(null);
    const selectionRef = useRef({ start: value.length, end: value.length });
    const [focused, setFocused] = useState(false);
    const [inputHeight, setInputHeight] = useState(INPUT_MIN_HEIGHT);
    const dictationActive = Boolean(
      dictation &&
        dictation.state !== "idle" &&
        dictation.state !== "error",
    );
    const recording = dictation?.state === "recording";
    const expanded =
      focused || value.length > 0 || Boolean(dictation && dictation.state !== "idle");
    const canSend =
      Boolean(value.trim()) &&
      !disabled &&
      !sendDisabled &&
      !loading &&
      !dictationActive;
    const explicitLineCount = value.length === 0 ? 1 : value.split("\n").length;
    const resolvedInputHeight = Math.min(
      Math.max(
        INPUT_MIN_HEIGHT,
        inputHeight,
        explicitLineCount * typography.body.lineHeight,
      ),
      INPUT_MAX_HEIGHT,
    );

    useImperativeHandle(
      forwardedRef,
      () => ({
        blur: () => inputRef.current?.blur(),
        focus: () => inputRef.current?.focus(),
      }),
      [],
    );

    const send = () => {
      if (!canSend) return;
      inputRef.current?.blur();
      onSend();
    };

    return (
      <View
        testID={testID ? `${testID}.surface` : undefined}
        style={[
          styles.surface,
          expanded ? styles.surfaceExpanded : styles.surfaceResting,
          focused && styles.surfaceFocused,
        ]}
      >
        {recording ? (
          <View style={styles.recordingRow}>
            <View style={styles.waveform} accessibilityElementsHidden>
              {(dictation.levels.length ? dictation.levels.slice(-16) : Array(8).fill(0.18)).map(
                (level, index) => (
                  <View
                    key={index}
                    style={[styles.waveformBar, { height: 4 + Math.round(level * 14) }]}
                  />
                ),
              )}
            </View>
            <Text
              tone="secondary"
              style={styles.elapsed}
              accessibilityLabel={`Recording, ${dictation.elapsedSeconds} seconds`}
            >
              {formatElapsed(dictation.elapsedSeconds)}
            </Text>
          </View>
        ) : (
          <View
            testID={testID ? `${testID}.prompt-row` : undefined}
            style={expanded ? styles.promptRowExpanded : styles.promptRowResting}
          >
            <Input
              ref={inputRef}
              testID={testID}
              variant="plain"
              accessibilityLabel={accessibilityLabel}
              accessibilityHint={accessibilityHint}
              placeholder={placeholder}
              value={value}
              onChangeText={onChangeText}
              onSelectionChange={(event) => {
                selectionRef.current = event.nativeEvent.selection;
              }}
              onContentSizeChange={(event) => {
                const next = Math.max(
                  INPUT_MIN_HEIGHT,
                  Math.round(event.nativeEvent.contentSize.height),
                );
                setInputHeight((current) => (current === next ? current : next));
              }}
              multiline
              multilineMinHeight={expanded ? resolvedInputHeight : INPUT_MIN_HEIGHT}
              multilineMaxHeight={INPUT_MAX_HEIGHT}
              textAlignVertical="top"
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={send}
              onPressIn={onPressIn}
              onFocus={() => {
                setFocused(true);
                onFocus?.();
              }}
              onBlur={() => setFocused(false)}
              maxLength={maxLength}
              editable={!disabled && !dictationActive}
            />
          </View>
        )}

        <View
          testID={testID ? `${testID}.toolbar` : undefined}
          style={expanded ? styles.toolbarExpanded : styles.toolbarResting}
        >
          <View
            testID={testID ? `${testID}.tool-well` : undefined}
            style={[styles.toolWell, !expanded && styles.toolWellResting]}
          >
            {dictation?.message ? (
              <Text tone="secondary" style={styles.dictationStatus} numberOfLines={1}>
                {dictation.message}
              </Text>
            ) : null}
            {dictation?.state === "error" && dictation.canRetry ? (
              <Pressable
                style={styles.statusAction}
                onPress={dictation.onRetry}
                accessibilityRole="button"
                accessibilityLabel="Retry transcription"
              >
                <Text style={styles.statusActionText}>Retry</Text>
              </Pressable>
            ) : null}
            {dictation?.state === "error" ? (
              <Pressable
                style={styles.dismissAction}
                onPress={dictation.onCancel}
                accessibilityRole="button"
                accessibilityLabel="Dismiss voice input error"
              >
                <Icon name="close" color={colors.textSecondary} size={16} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.primaryActions}>
            {dictation && dictation.state !== "error" ? (
              <Pressable
                style={styles.voiceButton}
                onPress={() => {
                  if (dictation.state === "recording") dictation.onStop();
                  else if (dictation.state === "connecting" || dictation.state === "transcribing") {
                    dictation.onCancel();
                  } else {
                    const selection = selectionRef.current;
                    dictation.onStart({
                      prompt: value,
                      selectionStart: selection.start,
                      selectionEnd: selection.end,
                    });
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  dictation.state === "recording"
                    ? "Stop and transcribe"
                    : dictation.state === "connecting" || dictation.state === "transcribing"
                      ? "Cancel voice input"
                      : "Start voice input"
                }
                disabled={disabled || loading}
              >
                <View style={[styles.voiceVisual, dictation.state === "recording" && styles.voiceVisualRecording]}>
                  {dictation.state === "connecting" || dictation.state === "transcribing" ? (
                    <KwiltLoader color={colors.textPrimary} />
                  ) : (
                    <Icon
                      name={dictation.state === "recording" ? "stop" : "mic"}
                      color={colors.textPrimary}
                      size={dictation.state === "recording" ? 13 : 18}
                    />
                  )}
                </View>
              </Pressable>
            ) : null}
          <Pressable
            testID={sendTestID}
            style={styles.sendButton}
            onPress={send}
            accessibilityRole="button"
            accessibilityLabel={sendAccessibilityLabel}
            disabled={!canSend}
          >
            <View style={[styles.actionVisual, !canSend && styles.actionInactive]}>
              {loading ? (
                <KwiltLoader color={colors.canvas} />
              ) : (
                <Icon name="arrowUp" color={colors.canvas} size={18} />
              )}
            </View>
          </Pressable>
          </View>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  surface: {
    width: "100%",
    backgroundColor: colors.inputFill,
    borderWidth: 2,
    borderColor: "transparent",
    padding: 3,
  },
  surfaceResting: {
    minHeight: 50,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
  },
  surfaceExpanded: {
    borderRadius: radii.composer,
  },
  surfaceFocused: {
    borderColor: colors.accent, // @kwilt-brand-moment: mirrors Unified Chat's focused composer ring.
  },
  promptRowResting: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  promptRowExpanded: {
    width: "100%",
    minWidth: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  toolbarResting: {
    marginLeft: "auto",
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  toolbarExpanded: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toolWell: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  toolWellResting: {
    flex: 0,
  },
  primaryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: "auto",
  },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
  },
  actionVisual: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
  },
  actionInactive: { opacity: 0.28 },
  voiceButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
  },
  voiceVisual: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.inputFillPressed,
  },
  voiceVisualRecording: {
    backgroundColor: colors.inputFillOnMuted,
  },
  recordingRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  waveform: {
    flex: 1,
    height: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  waveformBar: {
    width: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.textSecondary,
  },
  elapsed: {
    ...typography.bodySm,
    fontVariant: ["tabular-nums"],
  },
  dictationStatus: {
    ...typography.bodySm,
    flexShrink: 1,
  },
  statusAction: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  statusActionText: {
    ...typography.bodySm,
  },
  dismissAction: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
  },
});
