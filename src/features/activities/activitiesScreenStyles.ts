import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, fonts } from '../../theme/typography';

export const QUICK_ADD_BAR_HEIGHT = 64;

export const styles = StyleSheet.create({
  fixedToolbarContainer: {
    // Toolbar stays fixed above the scroll view
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  suggestedCardFixedContainer: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  scroll: {
    flex: 1,
    // Let the scroll view extend into the AppShell horizontal padding so shadows
    // can render up to the true screen edge (UIScrollView clips to its bounds).
    marginHorizontal: -spacing.sm,
  },
  scrollContent: {
    paddingBottom: spacing['2xl'],
    // Re-apply the canonical canvas gutter inside the scroll content after
    // expanding the scroll view bounds.
    paddingHorizontal: spacing.sm,
  },
  activityItemSeparator: {
    // XS/2 vertical gap between list items
    height: spacing.xs / 2,
  },
  toolbarRow: {
    marginBottom: spacing.sm,
  },
  toolbarButtonWrapper: {
    flexShrink: 0,
    position: 'relative',
  },
  toolbarBadgeCorner: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 1,
  },
  toolbarButtonLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  toolbarBadge: {
    paddingHorizontal: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarBadgeText: {
    fontSize: 9,
    fontFamily: typography.label.fontFamily,
    color: colors.canvas,
    textAlign: 'center',
    lineHeight: 12,
  },
  proLockedButton: {
    position: 'relative',
  },
  proLockedBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    // When centered via flex: 1 + justifyContent: 'center', we don't want
    // a fixed top margin pushing it off-center.
    marginTop: 0,
  },
  suggestedCard: {
    // Deprecated: Suggested card has been migrated to OpportunityCard.
    // Keep this style around temporarily to avoid churn in diffs while we verify
    // the new design across states.
    marginBottom: spacing.md,
  },
  suggestedCardHighlighted: {
    // Deprecated: see `suggestedOpportunityCardHighlighted`.
    borderColor: colors.accent,
  },
  suggestedTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  suggestedPill: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  suggestedBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  // Legacy OpportunityCard styling for the old "Suggested" module. Keep around for now
  // to avoid noisy diffs in case we decide to bring back the green opportunity surface.
  suggestedOpportunityCard: { marginBottom: spacing.md },
  suggestedOpportunityCardHighlighted: { borderWidth: 2, borderColor: colors.accent },
  widgetNudgeCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  widgetNudgeTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  widgetNudgeBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  widgetModalBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  quickAddLabelOnBrand: { ...typography.bodySm, color: colors.parchment, fontFamily: fonts.semibold, letterSpacing: 0.2 },
  suggestedPillOnBrand: { ...typography.bodySm, color: colors.parchment, opacity: 0.9 },
  quickAddMetaOnBrand: { ...typography.bodySm, color: colors.parchment, opacity: 0.9 },
  aiPickCard: {
    marginBottom: spacing.md,
    marginHorizontal: 0,
  },
  aiPickCardHighlighted: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  aiPickLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    letterSpacing: 0.2,
  },
  aiPickPill: {
    ...typography.bodySm,
    color: colors.textSecondary,
    opacity: 0.9,
  },
  aiPickCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  aiPickTitle: {
    ...typography.body,
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  aiPickSetupBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  aiPickOnBrandLabel: {
    ...typography.bodySm,
    color: colors.parchment,
    fontFamily: fonts.semibold,
    letterSpacing: 0.2,
  },
  aiPickOnBrandPill: {
    ...typography.bodySm,
    color: colors.parchment,
    opacity: 0.9,
  },
  quickAddInfoBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  emptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  completedSection: {
    marginTop: spacing['2xl'],
  },
  completedToggle: {
    paddingVertical: spacing.xs,
  },
  completedToggleLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  completedCountLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  menuItemText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  newViewMenuItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
    marginHorizontal: -spacing.xs,
    paddingLeft: spacing.xs + spacing.sm,
    paddingRight: spacing.xs + spacing.sm,
  },
  activitiesGuideTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  activitiesGuideBody: {
    ...typography.body,
    color: colors.textPrimary,
  },
  activityCoachContainer: {
    flex: 1,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandWordmark: {
    ...typography.bodySm,
    fontFamily: fonts.logo,
    color: colors.accent,
    marginLeft: spacing.xs,
  },
  activityCoachBody: {
    flex: 1,
  },
  activityAiCreditsEmpty: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerSideRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: spacing.xs / 2,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
  },
  segmentedOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  segmentedOptionActive: {
    backgroundColor: colors.canvas,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  segmentedOptionLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  segmentedOptionLabelActive: {
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  segmentedOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  manualFormContainer: {
    flex: 1,
    // Let the BottomDrawer define the horizontal gutters; the card inside this
    // ScrollView will run full-width within those paddings.
    paddingHorizontal: 0,
    paddingTop: spacing.sm,
  },
  modalLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  modalBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    minHeight: 44,
  },
  manualNarrativeInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  addStepInlineRow: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  addStepInlineText: {
    ...typography.bodySm,
    color: colors.accent,
  },
  rowsCard: {
    borderRadius: 20,
    backgroundColor: colors.canvas,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  inputLabel: {
    ...typography.label,
    color: colors.formLabel,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionLabelRow: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
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
    paddingVertical: spacing.sm,
  },
  stepRow: {
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
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
  stepCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
  },
  stepInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
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
    width: 32,
    height: 32,
    borderRadius: 999,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowPressed: {
    backgroundColor: colors.shellAlt,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  rowLabelActive: {
    color: colors.accent,
  },
  rowContent: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  rowValue: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  rowRight: {
    flexShrink: 1,
    paddingHorizontal: spacing.sm,
  },
  rowValueAi: {
    color: colors.accent,
  },
  planningHeader: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
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
  kanbanFieldsSheetContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  kanbanFieldsListContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  kanbanFieldsSheetSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  kanbanFieldsSortCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.shell,
  },
  kanbanFieldsSortCardActive: {
    backgroundColor: colors.gray100,
  },
  kanbanFieldsSortRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  kanbanFieldsDragHandle: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kanbanFieldsRowPressable: {
    flex: 1,
    paddingRight: spacing.sm,
    borderRadius: 12,
  },
  kanbanFieldsRowPressed: {
    backgroundColor: colors.shell,
  },
  kanbanFieldsRowTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  triggerGuideTitle: {
    ...typography.titleSm,
    color: colors.turmeric700,
  },
  triggerGuideBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  triggerGuideActions: {
    marginTop: spacing.sm,
    justifyContent: 'flex-end',
  },
  sheetRow: {
    paddingVertical: spacing.sm,
  },
  sheetRowLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  datePickerContainer: {
    marginTop: spacing.sm,
  },
  viewEditorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewEditorBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  viewEditorCard: {
    maxWidth: 480,
    width: '90%',
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.canvas,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  viewEditorTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  viewEditorDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  viewEditorFieldLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  viewEditorToggleRow: {
    marginTop: spacing.lg,
  },
  aiErrorFallbackRow: {
    // Deprecated: manual fallback card is now rendered inside AiChatScreen.
    display: 'none',
  },
  viewEditorToggleLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  viewEditorToggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
    padding: 2,
    justifyContent: 'center',
  },
  viewEditorToggleTrackOn: {
    backgroundColor: colors.accent,
  },
  viewEditorToggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.canvas,
    alignSelf: 'flex-start',
  },
  viewEditorToggleThumbOn: {
    alignSelf: 'flex-end',
  },
  viewEditorShortcutsSection: {
    marginTop: spacing.lg,
  },
  viewEditorSecondaryActions: {
    flexDirection: 'row',
  },
  viewEditorActions: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewEditorShortcutLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  viewEditorShortcutDestructiveLabel: {
    ...typography.bodySm,
    color: colors.canvas,
  },
});

