import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { cardElevation, colors, spacing, typography } from '../theme';
import { BottomDrawer } from './BottomDrawer';
import { Icon } from './Icon';
import { Toolbar, ToolbarButton, ToolbarGroup } from './Toolbar';
import { EditorSurface, EditorHeader } from './EditorSurface';

type AiHelpContext = {
  objectType: 'arc' | 'goal' | 'activity' | 'chapter';
  objectId: string;
  fieldId: string;
  currentText: string;
};

export type LongTextFieldProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /**
   * When true, hides the small label rendered above the read-surface.
   * Useful when the parent already renders a section label (e.g., Activity Detail).
   */
  hideLabel?: boolean;
  /**
   * Drawer snap points for the editor. Defaults to a large editor surface.
   */
  snapPoints?: Array<number | `${number}%`>;
  /**
   * Debounce interval for autosave while typing. Defaults to 500ms.
   */
  autosaveDebounceMs?: number;
  enableAi?: boolean;
  onRequestAiHelp?: (args: AiHelpContext) => void;
  aiContext?: Omit<AiHelpContext, 'currentText'>;
};

/**
 * LongTextField
 * - Always renders the full value on the canvas (read surface).
 * - Tapping opens a large BottomDrawer editor above the keyboard (write surface).
 * - Save-only autosave: changes are persisted as the user types (debounced) and on close.
 *
 * This intentionally avoids inline TextInput editing on the canvas to prevent
 * fragile keyboard/scroll interactions on complex detail pages.
 */
export function LongTextField({
  label,
  value,
  onChange,
  placeholder = 'Tap to add details',
  disabled,
  hideLabel = false,
  snapPoints = ['92%'],
  autosaveDebounceMs = 500,
  enableAi,
  onRequestAiHelp,
  aiContext,
}: LongTextFieldProps) {
  const [editorVisible, setEditorVisible] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<TextInput | null>(null);
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef<string>(value);

  // Keep track of external updates when NOT editing.
  useEffect(() => {
    if (editorVisible) return;
    setDraft(value);
    lastCommittedRef.current = value;
  }, [editorVisible, value]);


  const flush = (next: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (next === lastCommittedRef.current) return;
    lastCommittedRef.current = next;
    onChange(next);
  };

  // Autosave while typing (debounced) when editor is open.
  useEffect(() => {
    if (!editorVisible) return;
    if (draft === lastCommittedRef.current) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => flush(draft), autosaveDebounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, editorVisible, autosaveDebounceMs]);

  const openEditor = () => {
    if (disabled) return;
    setDraft(value);
    lastCommittedRef.current = value;
    setEditorVisible(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const closeEditor = () => {
    setEditorVisible(false);
    flush(draft);
  };

  const accessoryId = useMemo(() => `kwilt-longtext-accessory-${label.replace(/\s+/g, '-')}`, [label]);

  const showAi = Boolean(enableAi && onRequestAiHelp && aiContext);

  const clampSelection = (next: { start: number; end: number }, text: string) => {
    const max = text.length;
    return {
      start: Math.max(0, Math.min(next.start, max)),
      end: Math.max(0, Math.min(next.end, max)),
    };
  };

  const applyReplace = (nextText: string, nextSelection: { start: number; end: number }) => {
    setDraft(nextText);
    const clamped = clampSelection(nextSelection, nextText);
    requestAnimationFrame(() => {
      setSelection(clamped);
    });
  };

  const getLineBoundsAt = (text: string, index: number) => {
    const safeIndex = Math.max(0, Math.min(index, text.length));
    const before = text.lastIndexOf('\n', safeIndex - 1);
    const after = text.indexOf('\n', safeIndex);
    const lineStart = before === -1 ? 0 : before + 1;
    const lineEnd = after === -1 ? text.length : after;
    return { lineStart, lineEnd };
  };

  const applyInlineWrap = (prefix: string, suffix: string) => {
    const { start, end } = selection;
    const hasSelection = start !== end;
    const a = Math.min(start, end);
    const b = Math.max(start, end);
    const selected = draft.slice(a, b);
    const insert = hasSelection ? `${prefix}${selected}${suffix}` : `${prefix}${suffix}`;
    const next = `${draft.slice(0, a)}${insert}${draft.slice(b)}`;
    const cursor = hasSelection ? a + insert.length : a + prefix.length;
    applyReplace(next, { start: cursor, end: cursor });
  };

  const applyListPrefix = (kind: 'ul' | 'ol') => {
    const { start, end } = selection;
    const a = Math.min(start, end);
    const b = Math.max(start, end);
    const boundsA = getLineBoundsAt(draft, a);
    const boundsB = getLineBoundsAt(draft, b);
    const blockStart = boundsA.lineStart;
    const blockEnd = boundsB.lineEnd;
    const block = draft.slice(blockStart, blockEnd);
    const lines = block.split('\n');

    let index = 1;
    const prefixed = lines.map((line) => {
      const trimmed = line.trimStart();
      const leadingSpaces = line.slice(0, line.length - trimmed.length);
      if (trimmed.length === 0) return line;
      if (kind === 'ul') {
        // Avoid double-prefixing.
        if (/^[-*]\s+/.test(trimmed)) return line;
        return `${leadingSpaces}- ${trimmed}`;
      }
      // OL
      if (/^\d+\.\s+/.test(trimmed)) return line;
      const next = `${leadingSpaces}${index}. ${trimmed}`;
      index += 1;
      return next;
    });

    const nextBlock = prefixed.join('\n');
    const nextText = `${draft.slice(0, blockStart)}${nextBlock}${draft.slice(blockEnd)}`;
    const delta = nextBlock.length - block.length;
    applyReplace(nextText, { start: start + delta, end: end + delta });
  };

  const applyHyperlink = () => {
    const { start, end } = selection;
    const a = Math.min(start, end);
    const b = Math.max(start, end);
    const selected = draft.slice(a, b) || 'link text';
    const urlPlaceholder = 'https://';
    const insert = `[${selected}](${urlPlaceholder})`;
    const next = `${draft.slice(0, a)}${insert}${draft.slice(b)}`;
    const urlStart = a + 1 + selected.length + 2; // `[${selected}](` -> position at start of url
    const urlEnd = urlStart + urlPlaceholder.length;
    applyReplace(next, { start: urlStart, end: urlEnd });
  };

  const renderToolbar = () => {
    return (
      <View style={styles.accessoryBarContainer}>
        <Toolbar style={styles.toolbarFloating} center>
          <ToolbarGroup>
            <ToolbarButton
              accessibilityLabel="Bold"
              onPress={() => applyInlineWrap('**', '**')}
              icon="bold"
            />
            <ToolbarButton
              accessibilityLabel="Italics"
              onPress={() => applyInlineWrap('*', '*')}
              icon="italic"
            />
            <ToolbarButton
              accessibilityLabel="Underline"
              onPress={() => applyInlineWrap('<u>', '</u>')}
              icon="underline"
            />
          </ToolbarGroup>

          <ToolbarGroup>
            <ToolbarButton
              accessibilityLabel="Ordered list"
              onPress={() => applyListPrefix('ol')}
              icon="listOrdered"
            />
            <ToolbarButton
              accessibilityLabel="Bulleted list"
              onPress={() => applyListPrefix('ul')}
              icon="listBulleted"
            />
            <ToolbarButton
              accessibilityLabel="Insert hyperlink"
              onPress={applyHyperlink}
              icon="link"
            />
          </ToolbarGroup>

          {showAi ? (
            <ToolbarButton
              accessibilityLabel="Refine with AI"
              onPress={() => {
                if (!onRequestAiHelp || !aiContext) return;
                onRequestAiHelp({ ...aiContext, currentText: draft });
              }}
              icon="sparkles"
              label="Refine"
              variant="primary"
            />
          ) : null}
        </Toolbar>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {!hideLabel ? (
        <View style={styles.labelRow}>
          <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${label}`}
        disabled={disabled}
        onPress={openEditor}
        style={({ pressed }) => [
          styles.readSurface,
          disabled && styles.readSurfaceDisabled,
          pressed && !disabled ? styles.readSurfacePressed : null,
          cardElevation.soft,
        ]}
      >
        {value?.length ? (
          <Text style={styles.valueText}>{value}</Text>
        ) : (
          <Text style={styles.placeholderText}>{placeholder}</Text>
        )}
      </Pressable>

      <BottomDrawer
        visible={editorVisible}
        onClose={closeEditor}
        snapPoints={snapPoints}
        // Make this read as a dedicated editor surface, not a typical rounded "guide" drawer.
        sheetStyle={{
          backgroundColor: colors.canvas,
          paddingHorizontal: 0,
          paddingTop: 0,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}
        handleContainerStyle={{ paddingTop: 0, paddingBottom: 0 }}
        handleStyle={{ width: 0, height: 0, opacity: 0 }}
        // Avoid double keyboard handling:
        // - BottomDrawer's KeyboardAvoidingView lifts the whole sheet
        // - EditorSurface handles keyboard height tracking and padding internally
        // Using both can create large "dead space" and janky scroll.
        keyboardAvoidanceEnabled={false}
      >
        <EditorSurface
          visible={editorVisible}
          accessoryId={accessoryId}
          header={
            <EditorHeader
              left={
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {label}
                </Text>
              }
              right={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                  onPress={closeEditor}
                  hitSlop={8}
                  style={{ alignItems: 'flex-end' }}
                >
                  <Text style={styles.headerActionText}>Done</Text>
                </Pressable>
              }
            />
          }
          toolbar={renderToolbar()}
          bodyStyle={styles.editorBodyContent}
        >
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            multiline
            scrollEnabled
            textAlignVertical="top"
            style={styles.editorTextInput}
            inputAccessoryViewID={Platform.OS === 'ios' ? accessoryId : undefined}
            selection={selection}
            onSelectionChange={(e) => {
              const next = e.nativeEvent.selection;
              setSelection(next);
            }}
          />
        </EditorSurface>
      </BottomDrawer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 0,
  },
  labelRow: {
    marginBottom: spacing.xs,
    paddingLeft: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  labelDisabled: {
    color: colors.muted,
  },
  readSurface: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: spacing['2xl'] * 2,
  },
  readSurfaceDisabled: {
    opacity: 0.6,
  },
  readSurfacePressed: {
    opacity: 0.92,
  },
  valueText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  placeholderText: {
    ...typography.body,
    color: colors.muted,
  },
  headerTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  headerActionText: {
    ...typography.body,
    color: colors.accent,
  },
  editorBodyContent: {
    // Small padding around the actual copy area, like the reference.
    paddingHorizontal: spacing.sm,
  },
  editorTextInput: {
    flex: 1,
    minHeight: 0,
    ...typography.body,
    color: colors.textPrimary,
    // Give the copy area its own comfortable inset, but keep the overall surface
    // edge-to-edge white.
    paddingHorizontal: spacing.sm,
    paddingVertical: 0,
  },
  accessoryBarContainer: {
    backgroundColor: colors.canvas,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    // Center the toolbar group within the available width (matches the reference).
    alignItems: 'center',
  },
  toolbarFloating: {
    // keep the pills visually floating over the white surface
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    // This makes the toolbar feel centered rather than "full bleed".
    width: '100%',
    maxWidth: 520,
  },
});

