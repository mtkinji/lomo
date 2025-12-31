import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutRectangle,
} from 'react-native';
import { cardElevation, colors, spacing, typography } from '../theme';
import { Icon } from './Icon';
import { RichEditor, actions } from 'react-native-pell-rich-editor';
import { Toolbar, ToolbarButton, ToolbarGroup } from './Toolbar';
import { EditorSurface, EditorHeader } from './EditorSurface';
import { UnderKeyboardDrawer } from './UnderKeyboardDrawer';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { Coachmark } from './Coachmark';
import { useCoachmarkHost } from './hooks/useCoachmarkHost';
import { Text as KwiltText } from './Typography';
import { refineWritingWithAI, type WritingRefinePreset } from '../services/ai';
import { RichTextBlock } from './RichTextBlock';
import { htmlToPlainText, normalizeToHtml, sanitizeRichTextHtml } from './richText';
import { useAppStore } from '../store/useAppStore';

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
  /**
   * Optional stable testID for E2E tests. Applied to the canvas read-surface
   * press target and the editor drawer close button.
   */
  testID?: string;
  placeholder?: string;
  disabled?: boolean;
  /**
   * When true, hides the small label rendered above the read-surface.
   * Useful when the parent already renders a section label (e.g., Activity Detail).
   */
  hideLabel?: boolean;
  /**
   * Controls how the read surface is presented on the canvas.
   * - 'card' (default): bordered surface with elevation (works well inside long forms).
   * - 'flat': no border/elevation, reads like content on the page (Airbnb-style).
   * - 'filled': borderless, subtle filled surface for a cleaner "no explicit borders" form look.
   */
  surfaceVariant?: 'card' | 'flat' | 'filled';
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
  testID,
  placeholder = 'Tap to add details',
  disabled,
  hideLabel = false,
  surfaceVariant = 'card',
  snapPoints = ['92%'],
  autosaveDebounceMs = 500,
  enableAi,
  onRequestAiHelp,
  aiContext,
}: LongTextFieldProps) {
  /**
   * Canonical keyboard + toolbar behavior (iOS):
   *
   * `UnderKeyboardDrawer` already reserves space equal to the keyboard height, but in practice
   * (depending on iOS keyboard mode, predictive bar, etc) the reported height can under-shoot
   * by a small amount. That causes our bottom toolbar (rendered inside the drawer) to land in
   * the "covered" region.
   *
   * We treat this small buffer as canonical: it nudges the visible area up just enough so the
   * toolbar consistently clears the keyboard without making the editor feel overly compressed.
   */
  const KEYBOARD_CLEARANCE_BUFFER_PX = 30;

  // The toolbar itself is measured at runtime; use a conservative fallback for the first render.
  const FALLBACK_TOOLBAR_HEIGHT_PX = 56;

  const [editorVisible, setEditorVisible] = useState(false);
  const [draftHtml, setDraftHtml] = useState<string>(() => normalizeToHtml(value));
  const richEditorRef = useRef<RichEditor | null>(null);
  const shouldAutoFocusRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef<string>(normalizeToHtml(value));
  const isProgrammaticHtmlSetRef = useRef(false);
  const hasUserEditedSinceRefineRef = useRef(false);
  const refineHistoryRef = useRef<null | { beforeHtml: string; afterHtml: string; state: 'before' | 'after' }>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [customDialogVisible, setCustomDialogVisible] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');
  const [linkDialogVisible, setLinkDialogVisible] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const accessoryBarRef = useRef<View | null>(null);
  const refineAnchorRef = useRef<View | null>(null);
  const undoButtonRef = useRef<View | null>(null);
  const [refineMenuVisible, setRefineMenuVisible] = useState(false);
  const [accessoryBarLayout, setAccessoryBarLayout] = useState<LayoutRectangle | null>(null);
  const [refineAnchorLayout, setRefineAnchorLayout] = useState<LayoutRectangle | null>(null);
  const [undoCoachmarkVisible, setUndoCoachmarkVisible] = useState(false);

  const undoCoachmarkHost = useCoachmarkHost({
    active: Boolean(editorVisible && undoCoachmarkVisible && undoButtonRef.current),
    stepKey: 'undo',
  });

  const measuredToolbarHeightPx = accessoryBarLayout?.height ?? FALLBACK_TOOLBAR_HEIGHT_PX;

  const hasSeenRefineUndoCoachmark = useAppStore((state) => state.hasSeenRefineUndoCoachmark);
  const setHasSeenRefineUndoCoachmark = useAppStore((state) => state.setHasSeenRefineUndoCoachmark);

  // Keep track of external updates when NOT editing.
  useEffect(() => {
    if (editorVisible) return;
    const nextHtml = normalizeToHtml(value);
    setDraftHtml(nextHtml);
    lastCommittedRef.current = nextHtml;
  }, [editorVisible, value]);

  const normalizedReadHtml = normalizeToHtml(value);
  const readSurfaceHasLinks = /<a\b[^>]*\bhref\s*=\s*['"][^'"]+['"][^>]*>/i.test(normalizedReadHtml);

  const flush = (next: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (next === lastCommittedRef.current) return;
    lastCommittedRef.current = next;
    // Parent screens often do `.trim()` / empty checks before persisting.
    // Ensure "visually empty" rich text doesn't get stored as `<p></p>`.
    const plain = htmlToPlainText(next).trim();
    onChange(plain.length === 0 ? '' : next);
  };

  // Autosave while typing (debounced) when editor is open.
  useEffect(() => {
    if (!editorVisible) return;
    if (draftHtml === lastCommittedRef.current) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => flush(draftHtml), autosaveDebounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftHtml, editorVisible, autosaveDebounceMs]);

  const openEditor = () => {
    if (disabled) return;
    const html = normalizeToHtml(value);
    setDraftHtml(html);
    lastCommittedRef.current = html;
    shouldAutoFocusRef.current = true;
    setEditorVisible(true);
    requestAnimationFrame(() => {
      richEditorRef.current?.setContentHTML?.(html);
      // For WebView-based editors, focus is only reliable after initialization.
      // We'll also focus in `editorInitializedCallback`.
      richEditorRef.current?.focusContentEditor?.();
    });
  };

  const closeEditor = () => {
    setEditorVisible(false);
    shouldAutoFocusRef.current = false;
    setUndoCoachmarkVisible(false);
    refineHistoryRef.current = null;
    hasUserEditedSinceRefineRef.current = false;
    isProgrammaticHtmlSetRef.current = false;
    flush(draftHtml);
  };

  const openRefineMenu = () => {
    if (!enableAi) return;
    if (disabled) return;
    if (isRefining) return;
    setRefineMenuVisible(true);
  };

  const closeRefineMenu = () => {
    setRefineMenuVisible(false);
  };

  const applyHtmlToEditor = (html: string) => {
    // `initialContentHTML` only applies on mount; use setContentHTML for live updates.
    isProgrammaticHtmlSetRef.current = true;
    requestAnimationFrame(() => {
      richEditorRef.current?.setContentHTML?.(html);
    });
  };

  const maybeUndoRefine = () => {
    const hist = refineHistoryRef.current;
    if (!hist) return false;
    if (hasUserEditedSinceRefineRef.current) return false;
    if (hist.state !== 'after') return false;
    hist.state = 'before';
    setDraftHtml(hist.beforeHtml);
    applyHtmlToEditor(hist.beforeHtml);
    return true;
  };

  const maybeRedoRefine = () => {
    const hist = refineHistoryRef.current;
    if (!hist) return false;
    if (hasUserEditedSinceRefineRef.current) return false;
    if (hist.state !== 'before') return false;
    hist.state = 'after';
    setDraftHtml(hist.afterHtml);
    applyHtmlToEditor(hist.afterHtml);
    return true;
  };

  const runRefine = async (preset: WritingRefinePreset, instruction?: string) => {
    if (isRefining) return;
    const plain = htmlToPlainText(draftHtml);
    const current = plain?.trim() ?? '';
    if (!current) {
      Alert.alert('Nothing to refine', 'Add some text first, then try refining.');
      return;
    }

    closeRefineMenu();
    setIsRefining(true);
    const beforeHtml = draftHtml;
    try {
      const next = await refineWritingWithAI({
        text: plain,
        preset,
        instruction,
      });

      if (!next) {
        Alert.alert(
          'Refine unavailable',
          'Kwilt couldn’t reach the writing assistant right now. Please try again in a moment.',
        );
        return;
      }

      if (next.trim() === plain.trim()) {
        Alert.alert('No changes suggested', 'The assistant didn’t suggest any edits for this text.');
        return;
      }

      const nextHtml = normalizeToHtml(next);
      refineHistoryRef.current = { beforeHtml, afterHtml: nextHtml, state: 'after' };
      setDraftHtml(nextHtml);
      applyHtmlToEditor(nextHtml);
      hasUserEditedSinceRefineRef.current = false;

      // One-time tip: teach users the header Undo button restores the pre-refine version.
      if (!hasSeenRefineUndoCoachmark) {
        setUndoCoachmarkVisible(true);
      }
    } catch (e) {
      Alert.alert(
        'Refine unavailable',
        'Kwilt couldn’t reach the writing assistant right now. Please try again in a moment.',
      );
    } finally {
      setIsRefining(false);
    }
  };

  // Formatting is handled by the rich text editor itself.

  const execAction = (action: string) => {
    // Mimic RichToolbar behavior: sendAction(action, 'result')
    (richEditorRef.current as any)?.sendAction?.(action, 'result');
  };

  const openLinkDialog = () => {
    setLinkUrl('');
    setLinkText('');
    setLinkDialogVisible(true);
  };

  const renderToolbar = () => {
    const menuWidth = 260;
    const gutter = spacing.sm;
    const barW = accessoryBarLayout?.width ?? 0;
    const anchor = refineAnchorLayout;

    // Place menu directly above the Refine button in accessory-bar coordinates.
    const left = anchor
      ? Math.max(
          gutter,
          Math.min(anchor.x + anchor.width - menuWidth, Math.max(gutter, barW - gutter - menuWidth)),
        )
      : Math.max(gutter, barW - gutter - menuWidth);

    const bottom = (accessoryBarLayout?.height ?? 56) + spacing.xs;

    return (
      <View style={styles.accessoryBarContainer} ref={accessoryBarRef} onLayout={(e) => setAccessoryBarLayout(e.nativeEvent.layout)}>
        {enableAi && refineMenuVisible ? (
          <View
            style={[
              styles.refineMenuCard,
              {
                width: menuWidth,
                position: 'absolute',
                left,
                bottom,
              },
            ]}
          >
            {refineHistoryRef.current?.state === 'after' ? (
              <>
                <Pressable
                  disabled={isRefining}
                  onPress={() => {
                    maybeUndoRefine();
                    closeRefineMenu();
                  }}
                  style={({ pressed }) => [
                    styles.refineMenuItem,
                    pressed && !isRefining ? styles.refineMenuItemPressed : null,
                    isRefining ? styles.refineMenuItemDisabled : null,
                  ]}
                >
                  <Text style={styles.refineMenuItemText}>Undo last refine</Text>
                </Pressable>
                <View style={styles.refineMenuDivider} />
              </>
            ) : null}

            {[
              { key: 'fix', label: 'Fix grammar & clarity', preset: 'fix' as const },
              { key: 'simplify', label: 'Simplify', preset: 'simplify' as const },
              { key: 'shorten', label: 'Shorten', preset: 'shorten' as const },
              { key: 'expand', label: 'Expand', preset: 'expand' as const },
              { key: 'bullets', label: 'Make bullets', preset: 'bullets' as const },
            ].map((item) => (
              <Pressable
                key={item.key}
                disabled={isRefining}
                onPress={() => runRefine(item.preset)}
                style={({ pressed }) => [
                  styles.refineMenuItem,
                  pressed && !isRefining ? styles.refineMenuItemPressed : null,
                  isRefining ? styles.refineMenuItemDisabled : null,
                ]}
              >
                <Text style={styles.refineMenuItemText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Toolbar style={styles.toolbarFloating} center>
          <ToolbarGroup>
            <ToolbarButton
              accessibilityLabel="Bold"
              onPress={() => execAction(actions.setBold)}
              icon="bold"
            />
            <ToolbarButton
              accessibilityLabel="Italics"
              onPress={() => execAction(actions.setItalic)}
              icon="italic"
            />
            <ToolbarButton
              accessibilityLabel="Underline"
              onPress={() => execAction(actions.setUnderline)}
              icon="underline"
            />
          </ToolbarGroup>

          <ToolbarGroup>
            <ToolbarButton
              accessibilityLabel="Ordered list"
              onPress={() => execAction(actions.insertOrderedList)}
              icon="listOrdered"
            />
            <ToolbarButton
              accessibilityLabel="Bulleted list"
              onPress={() => execAction(actions.insertBulletsList)}
              icon="listBulleted"
            />
            <ToolbarButton
              accessibilityLabel="Insert hyperlink"
              onPress={openLinkDialog}
              icon="link"
            />
          </ToolbarGroup>

          {enableAi ? (
            <View
              ref={refineAnchorRef}
              collapsable={false}
              onLayout={(e) => setRefineAnchorLayout(e.nativeEvent.layout)}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refine"
                disabled={disabled}
                onPress={() => {
                  if (refineMenuVisible) {
                    closeRefineMenu();
                  } else {
                    openRefineMenu();
                  }
                }}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.refineTrigger,
                  pressed ? { opacity: 0.92 } : null,
                  disabled || isRefining ? { opacity: 0.6 } : null,
                ]}
              >
                <View style={styles.refineTriggerInner}>
                  {isRefining ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Icon name="sparkles" size={14} color={colors.primaryForeground} />
                  )}
                  <Text style={styles.refineTriggerText}>Refine</Text>
                </View>
              </Pressable>
            </View>
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

      {readSurfaceHasLinks ? (
        <View
          style={[
            surfaceVariant === 'flat'
              ? styles.readSurfaceFlat
              : surfaceVariant === 'filled'
              ? styles.readSurfaceFilled
              : styles.readSurface,
            disabled && styles.readSurfaceDisabled,
            surfaceVariant === 'flat' ? null : surfaceVariant === 'filled' ? null : cardElevation.soft,
          ]}
        >
          {htmlToPlainText(normalizedReadHtml).length ? (
            <>
              <RichTextBlock value={value} horizontalPaddingPx={surfaceVariant === 'flat' ? 0 : spacing.md} />
              {!disabled ? (
                <View style={styles.readSurfaceFooterRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${label}`}
                    onPress={openEditor}
                    hitSlop={8}
                    style={({ pressed }) => [styles.readSurfaceEditButton, pressed ? { opacity: 0.85 } : null]}
                  >
                    <Icon name="edit" size={14} color={colors.accent} />
                    <Text style={styles.readSurfaceEditText}>Edit</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : (
            // Even if we *would* have links, empty state should stay tappable.
            <Pressable
              testID={testID}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${label}`}
              disabled={disabled}
              onPress={openEditor}
              style={({ pressed }) => [pressed && !disabled ? styles.readSurfacePressed : null]}
            >
              <Text style={styles.placeholderText}>{placeholder}</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${label}`}
          disabled={disabled}
          onPress={openEditor}
          style={({ pressed }) => [
            surfaceVariant === 'flat'
              ? styles.readSurfaceFlat
              : surfaceVariant === 'filled'
              ? styles.readSurfaceFilled
              : styles.readSurface,
            disabled && styles.readSurfaceDisabled,
            pressed && !disabled ? styles.readSurfacePressed : null,
            surfaceVariant === 'flat' ? null : surfaceVariant === 'filled' ? null : cardElevation.soft,
          ]}
        >
          {htmlToPlainText(normalizeToHtml(value)).length ? (
            <RichTextBlock value={value} horizontalPaddingPx={surfaceVariant === 'flat' ? 0 : spacing.md} />
          ) : (
            <Text style={styles.placeholderText}>{placeholder}</Text>
          )}
        </Pressable>
      )}

      <UnderKeyboardDrawer
        visible={editorVisible}
        onClose={closeEditor}
        snapPoints={snapPoints}
        // Make this read as a dedicated editor surface, not a typical rounded "guide" drawer.
        topRadius="sm"
        elevationToken="lift"
        shadowDirection="up"
        includeKeyboardSpacer
        // Canonical: add a small buffer so the toolbar never ends up in the under-keyboard region.
        keyboardSpacerExtraHeightPx={KEYBOARD_CLEARANCE_BUFFER_PX}
        sheetStyle={{
          backgroundColor: colors.canvas,
        }}
        handleContainerStyle={{ paddingTop: 0, paddingBottom: 0 }}
        handleStyle={{ width: 0, height: 0, opacity: 0 }}
      >
        <EditorSurface
          visible={editorVisible}
          toolbarAttachment="absolute"
          bodyTopPadding={spacing.sm}
          // Reserve room so the last line isn't hidden behind the bottom toolbar.
          bodyBottomPadding={measuredToolbarHeightPx}
          keyboardClearance={0}
          disableBodyKeyboardPadding
          header={
            <EditorHeader
              left={
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {label}
                </Text>
              }
              right={
                <View style={styles.headerRightActions}>
                  <View ref={undoButtonRef} collapsable={false}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Undo"
                      onPress={() => {
                        if (maybeUndoRefine()) return;
                        execAction(actions.undo);
                      }}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.headerHistoryButton,
                        pressed ? { opacity: 0.7 } : null,
                      ]}
                    >
                      <Icon name="undo" size={16} color={colors.textPrimary} />
                    </Pressable>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Redo"
                    onPress={() => {
                      if (maybeRedoRefine()) return;
                      execAction(actions.redo);
                    }}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.headerHistoryButton,
                      pressed ? { opacity: 0.7 } : null,
                    ]}
                  >
                    <Icon name="redo" size={16} color={colors.textPrimary} />
                  </Pressable>
                  <View style={{ width: spacing.sm }} />
                  <Pressable
                    testID={testID ? `${testID}.editor.done` : undefined}
                    accessibilityRole="button"
                    accessibilityLabel="Done"
                    onPress={closeEditor}
                    hitSlop={8}
                    style={{ alignItems: 'flex-end' }}
                  >
                    <Text style={styles.headerActionText}>Done</Text>
                  </Pressable>
                </View>
              }
            />
          }
          toolbar={renderToolbar()}
          bodyStyle={styles.editorBodyContent}
        >
          <RichEditor
            ref={(node: RichEditor | null) => {
              richEditorRef.current = node;
            }}
            initialContentHTML={draftHtml}
            // Important: when `useContainer` is true, the library auto-grows the native
            // wrapper height to fit content, which prevents vertical scrolling in-place.
            // We want the editor to behave like a normal multiline input: fixed viewport + vertical scroll.
            useContainer={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator
            // Hide WKWebView's input accessory (prev/next + done arrows) so we only show our toolbar.
            // This does NOT disable iOS QuickType suggestions (those live in the keyboard itself).
            hideKeyboardAccessoryView
            autoCorrect
            // Best-effort: request initial focus for supported platforms,
            // but we still explicitly focus once initialized.
            initialFocus
            placeholder={placeholder}
            style={styles.editorRich}
            editorStyle={{
              backgroundColor: colors.canvas,
              color: colors.textPrimary,
              placeholderColor: colors.muted,
              // The WebView cannot access the Expo-loaded Inter font by name, so we use
              // a system font stack to match native typography closely (and avoid serif fallbacks).
              initialCSSText: `
                html, body, .content, .pell-content {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                  font-size: ${typography.body.fontSize}px !important;
                  line-height: ${typography.body.lineHeight}px !important;
                }
                html, body { overflow-x: hidden !important; }
                .content, .pell, .pell-content { overflow-x: hidden !important; }
                .pell-content {
                  /* Keep the text itself aligned with the native gutter, but reserve a small
                     right-side lane so the scroll indicator doesn't sit on top of text. */
                  padding: 0 ${spacing.sm}px 0 0 !important;
                  word-break: break-word !important;
                  overflow-wrap: anywhere !important;
                }
                p { margin: 0 !important; }
              `,
              contentCSSText: `
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                font-size: ${typography.body.fontSize}px !important;
                line-height: ${typography.body.lineHeight}px !important;
                overflow-x: hidden !important;
                word-break: break-word !important;
                overflow-wrap: anywhere !important;
              `,
            }}
            onChange={(html: string) => {
              const sanitized = sanitizeRichTextHtml(html);
              if (sanitized !== html) {
                // Keep paste behavior predictable: strip inline styles (like background colors)
                // and reflect the sanitized content back into the editor.
                setDraftHtml(sanitized);
                applyHtmlToEditor(sanitized);
                return;
              }

              setDraftHtml(html);
              if (isProgrammaticHtmlSetRef.current) {
                // setContentHTML causes an onChange — don't treat that as user editing.
                isProgrammaticHtmlSetRef.current = false;
                return;
              }
              if (refineHistoryRef.current) hasUserEditedSinceRefineRef.current = true;
            }}
            editorInitializedCallback={() => {
              if (!shouldAutoFocusRef.current) return;
              // Let the WebView finish layout before focusing.
              requestAnimationFrame(() => {
                richEditorRef.current?.focusContentEditor?.();
                shouldAutoFocusRef.current = false;
              });
            }}
          />
        </EditorSurface>

        <Coachmark
          visible={undoCoachmarkHost.coachmarkVisible}
          targetRef={undoButtonRef}
          remeasureKey={undoCoachmarkHost.remeasureKey}
          onDismiss={() => {
            setUndoCoachmarkVisible(false);
            setHasSeenRefineUndoCoachmark(true);
          }}
          placement="below"
          spotlight="ring"
          attentionPulse
          title={<KwiltText style={{ fontSize: 14, color: colors.textPrimary }}>Undo is available</KwiltText>}
          body={
            <KwiltText style={{ fontSize: 13, color: colors.textSecondary }}>
              Want the original text back? Tap Undo to restore what you had before refining.
            </KwiltText>
          }
        />
      </UnderKeyboardDrawer>

      <Dialog
        visible={linkDialogVisible}
        onClose={() => setLinkDialogVisible(false)}
        title="Insert link"
        description="Add a URL (and optional label)."
        footer={
          <View style={styles.customDialogFooter}>
            <Button variant="secondary" onPress={() => setLinkDialogVisible(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={() => {
                const url = linkUrl.trim();
                if (!url) {
                  Alert.alert('Add a URL', 'Paste a link like https://example.com');
                  return;
                }
                const title = linkText.trim() || url;
                (richEditorRef.current as any)?.insertLink?.(title, url);
                setLinkDialogVisible(false);
              }}
            >
              Insert
            </Button>
          </View>
        }
      >
        <View style={styles.customDialogBody}>
          <Text style={[styles.label, { paddingLeft: 2, marginBottom: spacing.xs }]}>URL</Text>
          <TextInput
            value={linkUrl}
            onChangeText={setLinkUrl}
            placeholder="https://…"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.customDialogInput}
          />
          <View style={{ height: spacing.sm }} />
          <Text style={[styles.label, { paddingLeft: 2, marginBottom: spacing.xs }]}>Label (optional)</Text>
          <TextInput
            value={linkText}
            onChangeText={setLinkText}
            placeholder="e.g. My site"
            placeholderTextColor={colors.muted}
            style={styles.customDialogInput}
          />
        </View>
      </Dialog>

      <Dialog
        visible={customDialogVisible}
        onClose={() => setCustomDialogVisible(false)}
        title="Custom refine"
        description="Tell Kwilt how you want this text rewritten."
        footer={
          <View style={styles.customDialogFooter}>
            <Button
              variant="secondary"
              onPress={() => setCustomDialogVisible(false)}
              disabled={isRefining}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={async () => {
                const instruction = customInstruction.trim();
                if (!instruction) {
                  Alert.alert('Add an instruction', 'For example: “Make this warmer and more concise.”');
                  return;
                }
                setCustomDialogVisible(false);
                await runRefine('custom', instruction);
              }}
              disabled={isRefining}
            >
              Apply
            </Button>
          </View>
        }
      >
        <View style={styles.customDialogBody}>
          <TextInput
            value={customInstruction}
            onChangeText={setCustomInstruction}
            placeholder="e.g. Make this more concise and friendly"
            placeholderTextColor={colors.muted}
            multiline
            style={styles.customDialogInput}
          />
        </View>
      </Dialog>
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
  readSurfaceFilled: {
    borderRadius: 12,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: colors.fieldFill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: spacing['2xl'] * 2,
  },
  readSurfaceFlat: {
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
    minHeight: 0,
  },
  readSurfaceDisabled: {
    opacity: 0.6,
  },
  readSurfacePressed: {
    opacity: 0.92,
  },
  valueText: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  placeholderText: {
    ...typography.bodySm,
    color: colors.muted,
  },
  readSurfaceFooterRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  readSurfaceEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  readSurfaceEditText: {
    ...typography.bodySm,
    color: colors.accent,
  },
  headerTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  headerActionText: {
    ...typography.body,
    color: colors.accent,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    justifyContent: 'flex-end',
  },
  headerHistoryButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorBodyContent: {
    // Restore the native-feeling horizontal gutter around the text area.
    paddingHorizontal: spacing.md,
  },
  editorRich: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.canvas,
    // Keep padding on the EditorSurface body, not inside the WebView container.
    paddingHorizontal: 0,
  },
  accessoryBarContainer: {
    backgroundColor: colors.canvas,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    // Center the toolbar group within the available width (matches the reference).
    alignItems: 'center',
    // Allow the inline menu to render above the bar.
    overflow: 'visible',
  },
  toolbarFloating: {
    // keep the pills visually floating over the white surface
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    // This makes the toolbar feel centered rather than "full bleed".
    width: '100%',
    maxWidth: 520,
  },
  refineTrigger: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  refineTriggerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  refineTriggerText: {
    ...typography.bodySm,
    color: colors.primaryForeground,
  },
  refineMenuCard: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    ...cardElevation.overlay,
  },
  refineMenuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
    marginHorizontal: -spacing.xs,
  },
  refineMenuItem: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    justifyContent: 'center',
  },
  refineMenuItemPressed: {
    backgroundColor: colors.shellAlt,
  },
  refineMenuItemDisabled: {
    opacity: 0.55,
  },
  refineMenuItemText: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  customDialogBody: {
    // Let the TextInput own its spacing.
  },
  customDialogInput: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 96,
  },
  customDialogFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    columnGap: spacing.sm,
  },
});

