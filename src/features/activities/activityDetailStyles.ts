import { Platform, StyleSheet } from 'react-native';
import { colors, fonts, spacing, typography } from '../../theme';

// Shared styles for Activity Detail (refresh layout).
export const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  // Frosted header "type pill" used on Activity detail (light canvas).
  headerTypePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerTypePillTint: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor is provided at render-time (light-surface material token).
  },
  headerTypePillContent: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  pageContent: {
    flex: 1,
  },
  headerSide: {
    flex: 1,
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSideRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerDoneToggle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDoneCheckbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
  },
  breadcrumbsLeft: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: spacing.sm,
  },
  breadcrumbsRight: {
    flex: 0,
  },
  menuRowText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  tagsFieldContainer: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: colors.fieldFill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  tagsFieldInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagChipText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  tagsTextInput: {
    flexGrow: 1,
    flexShrink: 1,
    // Important: keep this small so the presence of an (empty) TextInput does NOT
    // force a second wrapped row when chips still fit on the current row.
    flexBasis: 40,
    minWidth: 40,
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    lineHeight: typography.bodySm.lineHeight + 2,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  tagsAutofillBadge: {
    position: 'absolute',
  },
  attachmentsFieldContainer: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: colors.fieldFill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attachmentsFieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: spacing.sm,
  },
  attachmentsFieldLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  attachmentsFieldAction: {
    // Keep the affordance visually “inside” the filled field.
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fieldFillPressed,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing['2xl'],
    gap: spacing.xs,
  },
  section: {
    paddingVertical: spacing.xs,
  },
  sectionDivider: {
    // Canonical section rhythm (matches Arc/Goal detail pages): symmetric spacing.
    marginVertical: spacing.xl,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.gray300,
    borderRadius: 999,
  },
  sectionTitleBlock: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionCountBadge: {
    // Give the count a bit more breathing room from the label (matches list-row badge rhythm).
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: 999,
    alignSelf: 'center',
  },
  sectionCountBadgeText: {
    fontSize: 12,
    lineHeight: 14,
    // Slightly tighter tracking to read as a small count token.
    letterSpacing: 0.2,
  },
  keyActionsInset: {
    // AppShell already provides the page gutter. Keep Key Actions aligned with the
    // rest of the Activity canvas (and avoid double-padding).
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: spacing.md,
    flexWrap: 'wrap',
  },
  narrativeTitleBlock: {
    width: '100%',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  originLinkRow: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.linked,
    backgroundColor: colors.shellAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  originLinkText: {
    // Match "label" sizing without the uppercase/letterspacing so this reads as subtle provenance.
    ...typography.label,
    color: colors.linked,
    textTransform: 'none',
    letterSpacing: 0,
    flexShrink: 1,
  },
  narrativeTypePillRow: {
    marginBottom: spacing.xs,
  },
  narrativeTypePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.shellAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  narrativeTypePillLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
  },
  narrativeTitleContainer: {
    width: '100%',
  },
  narrativeTitle: {
    ...typography.titleLg,
    color: colors.textPrimary,
    fontFamily: fonts.bold,
  },
  narrativeTitleInput: {
    ...typography.titleLg,
    color: colors.textPrimary,
    fontFamily: fonts.bold,
  },
  contextPreview: {
    marginTop: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  contextPreviewPressed: {
    backgroundColor: colors.shellAlt,
  },
  contextPreviewText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  primaryActionText: {
    ...typography.body,
    color: colors.primaryForeground,
    fontFamily: fonts.semibold,
  },
  secondaryActionText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  rowPadding: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  titleStepsBundle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  bundleDivider: {
    height: 1,
    backgroundColor: colors.border,
    borderRadius: 999,
    marginVertical: 2,
  },
  titlePressable: {
    flex: 1,
    flexShrink: 1,
    justifyContent: 'center',
  },
  titleRow: {
    paddingHorizontal: 0,
    minHeight: 44,
  },
  titleRowContent: {
    // Keep the title vertically centered against the (slightly larger) checkbox.
    paddingVertical: spacing.xs,
  },
  titleText: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  titleInput: {
    ...typography.titleSm,
    color: colors.textPrimary,
    padding: 0,
    flexShrink: 1,
  },
  comboboxTrigger: {
    width: '100%',
  },
  comboboxValueContainer: {
    // `Input` dims non-editable fields by default. For combobox triggers, we want the
    // selected value to use the standard dark text appearance like other inputs.
    opacity: 1,
  },
  comboboxValueInput: {
    // Improve vertical centering of single-line value text (icon is already centered).
    color: colors.textPrimary,
    paddingVertical: 0,
    // Keep these explicit so we can safely override line metrics.
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    // Line-height strongly affects perceived vertical centering.
    lineHeight:
      Platform.OS === 'ios' ? typography.bodySm.fontSize + 2 : typography.bodySm.lineHeight,
    // Android-only props (harmless on iOS, but not relied upon there).
    includeFontPadding: false,
    textAlignVertical: 'center',
    // iOS: very small baseline nudge upward (text tends to sit slightly low).
    ...(Platform.OS === 'ios' ? { marginTop: -1 } : null),
  } as any,
  metaText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  detailGuideTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  detailGuideBody: {
    ...typography.body,
    color: colors.textPrimary,
  },
  checkboxBase: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxPlanned: {
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  checkboxCompleted: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  linkedCheckboxPlanned: {
    borderColor: colors.linked,
    backgroundColor: colors.canvas,
  },
  linkedCheckboxCompleted: {
    borderColor: colors.linked,
    backgroundColor: colors.linked,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowPressed: {
    backgroundColor: colors.fieldFillPressed,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  rowLabelActive: {
    color: colors.accent,
  },
  rowValueSet: {
    color: colors.sumi,
  },
  rowContent: {
    // Slightly taller than default row height without feeling oversized.
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  cardSectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    borderRadius: 999,
    marginVertical: 2,
  },
  rowsCard: {
    borderRadius: 12,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: colors.fieldFill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  planList: {
    gap: 2,
  },
  planListRow: {
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
  },
  planListRowInner: {
    paddingVertical: spacing.sm,
  },
  planListRowPressed: {
    backgroundColor: colors.shellAlt,
  },
  inputLabel: {
    ...typography.label,
    color: colors.formLabel,
    paddingHorizontal: spacing.sm,
    marginBottom: 2,
  },
  sectionLabelRow: {
    paddingHorizontal: spacing.sm,
    paddingBottom: 2,
  },
  stepsHeaderRow: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  stepsHeaderLabel: {
    ...typography.label,
    color: colors.formLabel,
  },
  addStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  addStepButtonText: {
    ...typography.label,
    color: colors.primaryForeground,
  },
  stepsEmpty: {
    ...typography.bodySm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stepRow: {
    minHeight: 44,
    // Center checkbox / text / actions vertically for consistent row rhythm.
    alignItems: 'center',
  },
  stepRowContent: {
    paddingVertical: 0,
    justifyContent: 'center',
  },
  linkedStepRowContent: {
    paddingVertical: 0,
    justifyContent: 'flex-start',
  },
  stepCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
  },
  stepLeftIconBox: {
    // Alignment box: keep left-column centers consistent with the title's 24x24 check-circle,
    // while allowing the actual step circle to remain smaller (via `stepCheckbox`).
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInput: {
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.xs / 2,
  },
  linkedStepTextBlock: {
    width: '100%',
  },
  linkedStepTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },
  linkedStepTitleLinked: {
    // Subtle "this is a link / derived" tint without adding extra words.
    color: colors.linked,
    fontFamily: fonts.medium,
  },
  linkedStepSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stepOptionalPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.shell,
  },
  stepOptionalText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  stepOptionalTextActive: {
    color: colors.accent,
  },
  removeStepButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
  },
  addStepRow: {
    marginTop: 0,
  },
  addStepInlineText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.accent,
    // Match the inline `Input` baseline metrics so "Add step" aligns with step titles.
    // (Vector icon glyphs + iOS baselines tend to read slightly low otherwise.)
    lineHeight: typography.body.fontSize + 3,
    ...(Platform.OS === 'android'
      ? ({
          includeFontPadding: false,
          textAlignVertical: 'center',
        } as const)
      : ({ marginTop: -1 } as const)),
  },
  rowValue: {
    ...typography.bodySm,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  rowRight: {
    flexShrink: 1,
    paddingHorizontal: spacing.sm,
  },
  rowValueAi: {
    color: colors.accent,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sheetTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sheetBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  estimateFieldsRow: {
    width: '100%',
  },
  estimatePickerContainer: {
    width: '100%',
    // Keep the wheel comfortably separated from the buttons.
    paddingVertical: spacing.sm,
    // Let the iOS wheel claim vertical space inside the sheet.
    flexGrow: 1,
    justifyContent: 'center',
  },
  estimateField: {
    flex: 1,
  },
  estimateFieldLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sheetRow: {
    paddingVertical: spacing.sm,
  },
  sheetRowLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  customRepeatHeaderRow: {
    width: '100%',
    marginBottom: spacing.md,
  },
  customRepeatHeaderTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    textAlign: 'center',
    flexShrink: 1,
  },
  customRepeatSetLabel: {
    ...typography.bodySm,
    color: colors.accent,
    fontFamily: fonts.semibold,
  },
  customRepeatPickerBlock: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  iosWheelFrame: {
    width: 140,
    height: 190,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.canvas,
    overflow: 'hidden',
  },
  iosWheelItem: {
    ...typography.titleSm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  customRepeatSectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  customRepeatWeekdayRow: {
    flexWrap: 'wrap',
  },
  customRepeatWeekdayChip: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customRepeatWeekdayChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  customRepeatWeekdayChipText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  customRepeatWeekdayChipTextSelected: {
    color: colors.primaryForeground,
  },
  datePickerContainer: {
    marginTop: spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  objectTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  objectTypeLabel: {
    fontFamily: fonts.medium,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0.5,
    color: colors.sumi,
  },
  objectTypeLabelV2: {
    ...typography.label,
    color: colors.sumi,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  headerV2: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
  headerV2TopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerV2Title: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  actionsTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  actionsButtonLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  actionsButtonLabelDestructive: {
    ...typography.body,
    color: colors.canvas,
    fontFamily: fonts.medium,
  },
  deleteLinkRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: spacing.sm,
  },
  deleteLinkLabel: {
    ...typography.bodySm,
    color: colors.destructive,
    fontFamily: fonts.semibold,
  },
  headerCompleteLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  backButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    width: 36,
    height: 36,
    backgroundColor: colors.primary,
  },
  optionsButton: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    width: 36,
    height: 36,
    backgroundColor: colors.primary,
  },
  destructiveMenuRowText: {
    ...typography.body,
    color: colors.destructive,
  },
  doneButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  doneButtonPressed: {
    opacity: 0.75,
  },
  doneButtonText: {
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  sheetDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  calendarPermissionNotice: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  calendarListContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  calendarChoiceRow: {
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.shell,
  },
  calendarChoiceRowSelected: {
    backgroundColor: colors.accent,
  },
  calendarChoiceLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  calendarChoiceLabelSelected: {
    color: colors.primaryForeground,
  },
  focusPresetRow: {
    flexWrap: 'wrap',
  },
  focusPresetChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  focusPresetChipPressed: {
    opacity: 0.86,
  },
  focusPresetChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  focusPresetChipText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  focusPresetChipTextSelected: {
    color: colors.primaryForeground,
  },
  focusOverlay: {
    flex: 1,
    backgroundColor: colors.pine700,
    paddingHorizontal: spacing.lg,
  },
  focusTopBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  focusSoundToggle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  focusSoundToggleOn: {
    backgroundColor: colors.parchment,
    borderColor: 'rgba(250,247,237,0.9)',
  },
  focusSoundToggleOff: {
    backgroundColor: 'rgba(250,247,237,0.08)',
    borderColor: 'rgba(250,247,237,0.35)',
  },
  focusSoundTogglePressed: {
    opacity: 0.9,
  },
  focusSoundToggleLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  focusSoundToggleLabelOn: {
    color: colors.pine800,
  },
  focusSoundToggleLabelOff: {
    color: colors.parchment,
  },
  focusSoundscapeTrigger: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  focusSoundscapeTriggerText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  focusCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  focusStreakOverlayLabel: {
    ...typography.body,
    color: colors.parchment,
    opacity: 0.9,
    marginTop: spacing.sm,
  },
  focusStreakSheetLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  focusTimer: {
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Rounded' : fonts.black,
    fontWeight: Platform.OS === 'ios' ? '900' : '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.2,
    fontSize: 78,
    lineHeight: 84,
    color: colors.parchment,
    textAlign: 'center',
  },
  focusActivityTitle: {
    ...typography.body,
    fontFamily: fonts.semibold,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  focusBottomBar: {
    marginTop: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusActionIconButton: {
    borderWidth: 1,
    borderColor: 'rgba(250,247,237,0.28)',
    backgroundColor: 'rgba(250,247,237,0.08)',
  },
});


