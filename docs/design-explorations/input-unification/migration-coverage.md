# Migration coverage

Status: implementation in progress, September 10, 2026. Historical census snapshots below are retained; current accounting is appended as migrations land.

The [migration ledger](migration-ledger.csv) assigns all 182 previously inventoried source sites across 85 files to a delivery task. Every row starts planned. No runtime route is certified by this assignment. The [original call-site snapshot](input-call-sites.csv) retains the inspected props. Task 01 in the [implementation plan](../../superpowers/plans/2026-09-10-input-unification.md) refreshes and broadens discovery before implementation.

## Completion accounting

Every discovered site must finish as **migrated**, **retained-exception**, or **removed-verified-unused**. Each needs a source revision and applicable runtime/behavior evidence. A file-wide exclusion, reduced count, unresolved alias, import-only search, or baseline edit cannot stand in for disposition. New discovery appends stable IDs; do not renumber existing rows.

## Native source coverage by task

### Task 02-03: Shared foundation and adapters

29 source sites in 11 files.

- [src/ui/Combobox.tsx](../../../src/ui/Combobox.tsx) — Input × 2
- [src/ui/EditableField.tsx](../../../src/ui/EditableField.tsx) — TextInput × 1
- [src/ui/EditableTextArea.tsx](../../../src/ui/EditableTextArea.tsx) — TextInput × 1
- [src/ui/FilterDrawer.tsx](../../../src/ui/FilterDrawer.tsx) — EnumPickerField × 5, Input × 5, RelationPickerField × 1
- [src/ui/Input.tsx](../../../src/ui/Input.tsx) — TextInput × 1
- [src/ui/LongTextField.tsx](../../../src/ui/LongTextField.tsx) — RichEditor × 1, TextInput × 3
- [src/ui/NarrativeEditableTitle.tsx](../../../src/ui/NarrativeEditableTitle.tsx) — TextInput × 1
- [src/ui/ObjectPicker.tsx](../../../src/ui/ObjectPicker.tsx) — Combobox × 1, Input × 1
- [src/ui/PickerFields.tsx](../../../src/ui/PickerFields.tsx) — Input × 1, PickerFieldTrigger × 2, TextInput × 1
- [src/ui/SettingsSurface.tsx](../../../src/ui/SettingsSurface.tsx) — Input × 1
- [src/ui/SortDrawer.tsx](../../../src/ui/SortDrawer.tsx) — EnumPickerField × 1

### Task 04: Representative native pilots

12 source sites in 6 files.

- [src/capabilities/chores/components/ChoreEditorDrawer.tsx](../../../src/capabilities/chores/components/ChoreEditorDrawer.tsx) — Input × 2, PickerFieldTrigger × 1, SmallSetPickerField × 3
- [src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx](../../../src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx) — Input × 1
- [src/features/goals/GoalsInventorySearchBar.tsx](../../../src/features/goals/GoalsInventorySearchBar.tsx) — Input × 1
- [src/features/search/GlobalSearchDrawer.tsx](../../../src/features/search/GlobalSearchDrawer.tsx) — Input × 1
- [src/features/shared-home/SharedLifeComposer.tsx](../../../src/features/shared-home/SharedLifeComposer.tsx) — Input × 2
- [src/features/shared-home/SharedLifeConversation.tsx](../../../src/features/shared-home/SharedLifeConversation.tsx) — Input × 1

### Task 05: Account, household, Plan and remaining forms

40 source sites in 22 files.

- [src/capabilities/chores/components/ChoreReviewDrawer.tsx](../../../src/capabilities/chores/components/ChoreReviewDrawer.tsx) — Input × 1
- [src/capabilities/chores/components/ChoreSettingsDrawer.tsx](../../../src/capabilities/chores/components/ChoreSettingsDrawer.tsx) — Input × 1
- [src/features/account/ActivityAreasSettingsScreen.tsx](../../../src/features/account/ActivityAreasSettingsScreen.tsx) — TextInput × 2
- [src/features/account/DestinationDetailScreen.tsx](../../../src/features/account/DestinationDetailScreen.tsx) — Input × 4
- [src/features/account/DestinationsLibraryScreen.tsx](../../../src/features/account/DestinationsLibraryScreen.tsx) — Input × 1
- [src/features/account/EmailPasswordSignInForm.tsx](../../../src/features/account/EmailPasswordSignInForm.tsx) — Input × 2
- [src/features/account/ExecutionTargetsSettingsScreen.tsx](../../../src/features/account/ExecutionTargetsSettingsScreen.tsx) — Input × 2
- [src/features/account/NotificationsSettingsScreen.tsx](../../../src/features/account/NotificationsSettingsScreen.tsx) — SmallSetPickerField × 2
- [src/features/account/PhoneAgentSettingsScreen.tsx](../../../src/features/account/PhoneAgentSettingsScreen.tsx) — Input × 3
- [src/features/account/ProfileSettingsScreen.tsx](../../../src/features/account/ProfileSettingsScreen.tsx) — Input × 3
- [src/features/account/SuperAdminToolsScreen.tsx](../../../src/features/account/SuperAdminToolsScreen.tsx) — Input × 2
- [src/features/dev/DevToolsScreen.tsx](../../../src/features/dev/DevToolsScreen.tsx) — TextInput × 1
- [src/features/household/HouseholdSettingsScreen.tsx](../../../src/features/household/HouseholdSettingsScreen.tsx) — Input × 4
- [src/features/household/personalDevice/ManagedChildDeviceHost.tsx](../../../src/features/household/personalDevice/ManagedChildDeviceHost.tsx) — TextInput × 1
- [src/features/onboarding/IdentityAspirationFlow.tsx](../../../src/features/onboarding/IdentityAspirationFlow.tsx) — Input × 4
- [src/features/plan/PlanCalendarSettingsScreen.tsx](../../../src/features/plan/PlanCalendarSettingsScreen.tsx) — RelationPickerField × 1
- [src/features/plan/PlanScheduleApplyPage.tsx](../../../src/features/plan/PlanScheduleApplyPage.tsx) — RelationPickerField × 1
- [src/features/plan/PlanSlotCapturePage.tsx](../../../src/features/plan/PlanSlotCapturePage.tsx) — Input × 1
- [src/features/safety/UgcReportDrawer.tsx](../../../src/features/safety/UgcReportDrawer.tsx) — Input × 1
- [src/features/screen-time/rule-builder/RuleSentencePickerField.tsx](../../../src/features/screen-time/rule-builder/RuleSentencePickerField.tsx) — Input × 1
- [src/features/shared-home/SharedLifeBrowser.tsx](../../../src/features/shared-home/SharedLifeBrowser.tsx) — Input × 1
- [src/features/shared-home/SharedLifeLibrary.tsx](../../../src/features/shared-home/SharedLifeLibrary.tsx) — Input × 1

### Task 06: Food forms and repeating editors

22 source sites in 16 files.

- [src/capabilities/groceries/components/KrogerStoreFinder.tsx](../../../src/capabilities/groceries/components/KrogerStoreFinder.tsx) — Input × 1
- [src/capabilities/groceries/components/StoreOpportunityCaptureSheet.tsx](../../../src/capabilities/groceries/components/StoreOpportunityCaptureSheet.tsx) — TextInput × 1
- [src/capabilities/groceries/screens/GroceryItemEditScreen.tsx](../../../src/capabilities/groceries/screens/GroceryItemEditScreen.tsx) — TextInput × 1
- [src/capabilities/meal-planning/components/MealOccasionDrawer.tsx](../../../src/capabilities/meal-planning/components/MealOccasionDrawer.tsx) — TextInput × 1
- [src/capabilities/meal-planning/components/MealPlanningReminderOfferDrawer.tsx](../../../src/capabilities/meal-planning/components/MealPlanningReminderOfferDrawer.tsx) — TextInput × 1
- [src/capabilities/meal-planning/components/TripTargetSheet.tsx](../../../src/capabilities/meal-planning/components/TripTargetSheet.tsx) — TextInput × 1
- [src/capabilities/meal-planning/screens/MealChoiceResponseScreen.tsx](../../../src/capabilities/meal-planning/screens/MealChoiceResponseScreen.tsx) — TextInput × 1
- [src/capabilities/meal-planning/screens/MealPlanEditorScreen.tsx](../../../src/capabilities/meal-planning/screens/MealPlanEditorScreen.tsx) — TextInput × 4
- [src/capabilities/recipes/components/IngredientLineEditor.tsx](../../../src/capabilities/recipes/components/IngredientLineEditor.tsx) — TextInput × 1
- [src/capabilities/recipes/components/InstructionSectionEditor.tsx](../../../src/capabilities/recipes/components/InstructionSectionEditor.tsx) — TextInput × 1
- [src/capabilities/recipes/screens/MealPlanDrawer.tsx](../../../src/capabilities/recipes/screens/MealPlanDrawer.tsx) — Input × 1
- [src/capabilities/recipes/screens/RecipeCookCompleteScreen.tsx](../../../src/capabilities/recipes/screens/RecipeCookCompleteScreen.tsx) — TextInput × 3
- [src/capabilities/recipes/screens/RecipeEditScreen.tsx](../../../src/capabilities/recipes/screens/RecipeEditScreen.tsx) — TextInput × 2
- [src/capabilities/recipes/screens/RecipeImportReviewScreen.tsx](../../../src/capabilities/recipes/screens/RecipeImportReviewScreen.tsx) — TextInput × 1
- [src/capabilities/recipes/screens/RecipeLibraryDrawers.tsx](../../../src/capabilities/recipes/screens/RecipeLibraryDrawers.tsx) — TextInput × 1
- [src/features/household-food/components/FoodNeedsDrawer.tsx](../../../src/features/household-food/components/FoodNeedsDrawer.tsx) — TextInput × 1

### Task 07: Money, Explore and Games

19 source sites in 10 files.

- [src/capabilities/explore/screens/ExploreMapScreen.tsx](../../../src/capabilities/explore/screens/ExploreMapScreen.tsx) — TextInput × 2
- [src/capabilities/games/features/connection-games/PromptConnectionGames.tsx](../../../src/capabilities/games/features/connection-games/PromptConnectionGames.tsx) — TextInput × 1
- [src/capabilities/games/features/remote/JoinTableDrawer.tsx](../../../src/capabilities/games/features/remote/JoinTableDrawer.tsx) — TextInput × 2
- [src/capabilities/games/features/setup/GamePlayerSetup.tsx](../../../src/capabilities/games/features/setup/GamePlayerSetup.tsx) — TextInput × 1
- [src/capabilities/games/players/PlayerIdentityEditor.tsx](../../../src/capabilities/games/players/PlayerIdentityEditor.tsx) — TextInput × 1
- [src/capabilities/money/components/MoneyTransactionSplitDrawer.tsx](../../../src/capabilities/money/components/MoneyTransactionSplitDrawer.tsx) — Input × 1
- [src/capabilities/money/screens/MoneyCategoryCreateScreen.tsx](../../../src/capabilities/money/screens/MoneyCategoryCreateScreen.tsx) — Input × 2
- [src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx](../../../src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx) — Input × 3
- [src/capabilities/money/screens/MoneyLivingPlanScreen.tsx](../../../src/capabilities/money/screens/MoneyLivingPlanScreen.tsx) — Input × 1
- [src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx](../../../src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx) — Input × 5

### Task 08: Inline editing, rich notes and capture

60 source sites in 21 files.

- [src/features/activities/ActivitiesScreen.tsx](../../../src/features/activities/ActivitiesScreen.tsx) — FormField × 2, Input × 1
- [src/features/activities/ActivityDetailRefresh.tsx](../../../src/features/activities/ActivityDetailRefresh.tsx) — EnumPickerField × 3, Input × 2, LongTextField × 1, NarrativeEditableTitle × 1, RelationPickerField × 1, SmallSetPickerField × 1, TextInput × 1
- [src/features/activities/ActivityDraftDetailFields.tsx](../../../src/features/activities/ActivityDraftDetailFields.tsx) — EnumPickerField × 2, Input × 2, LongTextField × 1, SmallSetPickerField × 1, TextInput × 2
- [src/features/activities/ActivityLocationSheet.tsx](../../../src/features/activities/ActivityLocationSheet.tsx) — Combobox × 1
- [src/features/activities/ActivityPeekFields.tsx](../../../src/features/activities/ActivityPeekFields.tsx) — LongTextField × 1
- [src/features/activities/InlineViewCreator.tsx](../../../src/features/activities/InlineViewCreator.tsx) — TextInput × 1
- [src/features/activities/QuickAddDock.tsx](../../../src/features/activities/QuickAddDock.tsx) — TextInput × 1
- [src/features/activities/TagGroupsDrawer.tsx](../../../src/features/activities/TagGroupsDrawer.tsx) — Input × 1
- [src/features/ai/AiChatScreen.tsx](../../../src/features/ai/AiChatScreen.tsx) — Input × 3, RelationPickerField × 1, TextInput × 6
- [src/features/arcs/ArcBannerSheet.tsx](../../../src/features/arcs/ArcBannerSheet.tsx) — Input × 1
- [src/features/arcs/ArcCreationFlow.tsx](../../../src/features/arcs/ArcCreationFlow.tsx) — Input × 1
- [src/features/arcs/ArcDetailScreen.tsx](../../../src/features/arcs/ArcDetailScreen.tsx) — NarrativeEditableTitle × 1, TextInput × 1
- [src/features/arcs/ArcsScreen.tsx](../../../src/features/arcs/ArcsScreen.tsx) — EditableField × 1, LongTextField × 1
- [src/features/arcs/GoalDetailScreen.tsx](../../../src/features/arcs/GoalDetailScreen.tsx) — EnumPickerField × 1, LongTextField × 1, NarrativeEditableTitle × 1, RelationPickerField × 1, TextInput × 3
- [src/features/chapters/ChapterDetailScreen.tsx](../../../src/features/chapters/ChapterDetailScreen.tsx) — TextInput × 2
- [src/features/goals/CheckinComposer.tsx](../../../src/features/goals/CheckinComposer.tsx) — TextInput × 1
- [src/features/goals/GoalCreationFlow.tsx](../../../src/features/goals/GoalCreationFlow.tsx) — Input × 2
- [src/features/goals/GoalFeedSection.tsx](../../../src/features/goals/GoalFeedSection.tsx) — TextInput × 1
- [src/features/goals/GoalsScreen.tsx](../../../src/features/goals/GoalsScreen.tsx) — EditableField × 1, LongTextField × 1, RelationPickerField × 1
- [src/features/goals/PendingCheckinDraftCard.tsx](../../../src/features/goals/PendingCheckinDraftCard.tsx) — TextInput × 1
- [src/features/goals/ShareGoalDrawer.tsx](../../../src/features/goals/ShareGoalDrawer.tsx) — Input × 1

## Additional discovery and propagation obligations

- **Embedded web workbench (Task 09):** inspect every `Input` and `Textarea` call in `/Users/andrewwatanabe/kwilt-site/components/unified-chat/KwiltChatWorkbench.tsx`, the owning CSS module, and both `components/ui` text controls. Record web sites separately; native totals do not include them. Recheck native entry/config and both resting/expanded composers, draft editors, and errors.
- **Raw aliases and hidden wrappers (Task 01):** trace named aliases, namespace/default React Native imports, `React.createElement`, local JSX wrappers, re-exports, rich editors, and embedded HTML. Review dev/admin/legacy reachability rather than silently excluding them.
- **Non-text controls:** native switches, sliders, date/time wheels and platform controls keep their semantics. Include any field-like closed trigger that visually belongs in a text form; do not recolor or rebuild the platform-owned control.
- **Token propagation (Task 02):** use new input-specific roles while existing `fieldFill` consumers remain visually stable. The list below is a lexical blast-radius inventory, not a determination that every consumer is an input. Classify each as input, non-input surface, or shared implementation.

- [packages/kwilt-tokens/src/colors.ts](../../../packages/kwilt-tokens/src/colors.ts)
- [src/capabilities/explore/screens/ExploreMapScreen.tsx](../../../src/capabilities/explore/screens/ExploreMapScreen.tsx)
- [src/capabilities/groceries/components/KrogerStoreFinder.tsx](../../../src/capabilities/groceries/components/KrogerStoreFinder.tsx)
- [src/capabilities/groceries/components/RetailerPreferenceList.tsx](../../../src/capabilities/groceries/components/RetailerPreferenceList.tsx)
- [src/capabilities/groceries/screens/GroceryItemEditScreen.tsx](../../../src/capabilities/groceries/screens/GroceryItemEditScreen.tsx)
- [src/capabilities/groceries/screens/OnlineShoppingSetupScreen.tsx](../../../src/capabilities/groceries/screens/OnlineShoppingSetupScreen.tsx)
- [src/capabilities/meal-planning/components/MealFitCallout.tsx](../../../src/capabilities/meal-planning/components/MealFitCallout.tsx)
- [src/capabilities/meal-planning/components/MealOccasionDrawer.tsx](../../../src/capabilities/meal-planning/components/MealOccasionDrawer.tsx)
- [src/capabilities/meal-planning/components/MealPlanningReminderOfferDrawer.tsx](../../../src/capabilities/meal-planning/components/MealPlanningReminderOfferDrawer.tsx)
- [src/capabilities/meal-planning/screens/MealChoiceResponseScreen.tsx](../../../src/capabilities/meal-planning/screens/MealChoiceResponseScreen.tsx)
- [src/capabilities/meal-planning/screens/MealPlanEditorScreen.tsx](../../../src/capabilities/meal-planning/screens/MealPlanEditorScreen.tsx)
- [src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.tsx](../../../src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.tsx)
- [src/capabilities/money/components/MoneyCategoryReorderDrawer.tsx](../../../src/capabilities/money/components/MoneyCategoryReorderDrawer.tsx)
- [src/capabilities/money/components/MoneyPlanLimitAnswer.tsx](../../../src/capabilities/money/components/MoneyPlanLimitAnswer.tsx)
- [src/capabilities/money/screens/MoneyAccountsScreen.tsx](../../../src/capabilities/money/screens/MoneyAccountsScreen.tsx)
- [src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx](../../../src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx)
- [src/capabilities/money/screens/MoneyScreenFrame.tsx](../../../src/capabilities/money/screens/MoneyScreenFrame.tsx)
- [src/capabilities/money/screens/MoneySummaryScreen.tsx](../../../src/capabilities/money/screens/MoneySummaryScreen.tsx)
- [src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx](../../../src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx)
- [src/capabilities/money/screens/MoneyTransactionsScreen.tsx](../../../src/capabilities/money/screens/MoneyTransactionsScreen.tsx)
- [src/capabilities/recipes/components/ImportEvidenceViewer.tsx](../../../src/capabilities/recipes/components/ImportEvidenceViewer.tsx)
- [src/capabilities/recipes/components/IngredientLineEditor.tsx](../../../src/capabilities/recipes/components/IngredientLineEditor.tsx)
- [src/capabilities/recipes/components/InstructionSectionEditor.tsx](../../../src/capabilities/recipes/components/InstructionSectionEditor.tsx)
- [src/capabilities/recipes/screens/MealPlanDrawer.tsx](../../../src/capabilities/recipes/screens/MealPlanDrawer.tsx)
- [src/capabilities/recipes/screens/RecipeCookCompleteScreen.tsx](../../../src/capabilities/recipes/screens/RecipeCookCompleteScreen.tsx)
- [src/capabilities/recipes/screens/RecipeEditScreen.tsx](../../../src/capabilities/recipes/screens/RecipeEditScreen.tsx)
- [src/capabilities/recipes/screens/RecipeImportReviewScreen.tsx](../../../src/capabilities/recipes/screens/RecipeImportReviewScreen.tsx)
- [src/capabilities/recipes/screens/RecipeLibraryScreen.styles.ts](../../../src/capabilities/recipes/screens/RecipeLibraryScreen.styles.ts)
- [src/features/account/EmailPasswordSignInForm.tsx](../../../src/features/account/EmailPasswordSignInForm.tsx)
- [src/features/account/SuperAdminToolsScreen.tsx](../../../src/features/account/SuperAdminToolsScreen.tsx)
- [src/features/activities/ActivityAttachmentCard.tsx](../../../src/features/activities/ActivityAttachmentCard.tsx)
- [src/features/activities/ActivityDraftDetailFields.tsx](../../../src/features/activities/ActivityDraftDetailFields.tsx)
- [src/features/activities/ActivityLocationSheet.tsx](../../../src/features/activities/ActivityLocationSheet.tsx)
- [src/features/activities/InlineViewCreator.tsx](../../../src/features/activities/InlineViewCreator.tsx)
- [src/features/activities/KanbanColumn.tsx](../../../src/features/activities/KanbanColumn.tsx)
- [src/features/activities/RepeatInfoMenu.tsx](../../../src/features/activities/RepeatInfoMenu.tsx)
- [src/features/activities/ViewCustomizationGuide.tsx](../../../src/features/activities/ViewCustomizationGuide.tsx)
- [src/features/activities/activityDetailStyles.ts](../../../src/features/activities/activityDetailStyles.ts)
- [src/features/household-food/components/FoodNeedsDrawer.tsx](../../../src/features/household-food/components/FoodNeedsDrawer.tsx)
- [src/features/household-food/components/MealPlanHeaderAction.tsx](../../../src/features/household-food/components/MealPlanHeaderAction.tsx)
- [src/features/household-food/components/MealSetupDrawer.tsx](../../../src/features/household-food/components/MealSetupDrawer.tsx)
- [src/features/household-food/components/UsualDinersDrawer.tsx](../../../src/features/household-food/components/UsualDinersDrawer.tsx)
- [src/features/onboarding/SignInInterstitial.tsx](../../../src/features/onboarding/SignInInterstitial.tsx)
- [src/features/safety/UgcReportDrawer.tsx](../../../src/features/safety/UgcReportDrawer.tsx)
- [src/features/workflow-feedback/WorkflowFeedbackInlineSlot.tsx](../../../src/features/workflow-feedback/WorkflowFeedbackInlineSlot.tsx)
- [src/features/workflow-feedback/WorkflowFeedbackQuestion.tsx](../../../src/features/workflow-feedback/WorkflowFeedbackQuestion.tsx)
- [src/ui/InlineClearButton.tsx](../../../src/ui/InlineClearButton.tsx)
- [src/ui/Input.tsx](../../../src/ui/Input.tsx)
- [src/ui/LongTextField.tsx](../../../src/ui/LongTextField.tsx)
- [src/ui/StreakCapsule.tsx](../../../src/ui/StreakCapsule.tsx)

The companion website currently defines `--kw-field-fill` and `--kw-field-fill-pressed` in `app/globals.css`; its values already differ from native. It has no `@kwilt/tokens` dependency in the inspected package manifest. Do not assume a native token build updates the web composer. Marketing and public guest forms are outside this mobile-input migration unless the dependency review proves a shared change would affect them; isolate the app workbench treatment in that case.


## Implementation discovery refresh

The AST scanner now accounts for **202 control/composition sites** (all 182 original sites plus 20 newly explicit wrapper sites). The ledger retains every original ID and adds INP-183 through INP-202. `input-ast-sites.json` also records 137 containing-component references as reachability evidence; these are not counted as separate fields. This is source discovery, not native rendering or reachable-screen acceptance.

The initial policy recorded 82 raw/material debt sites. Including implicit legacy defaults and dynamic variants, the current policy records 188 exact legacy debt entries and three owned-adapter exceptions, each linked to a ledger ID and task. Its fingerprint and multiplicity checks reject new or replacement debt even inside an existing debt file. The read-only inventory command is `node scripts/input-patterns/cli.mjs --inventory`; the check is `--check`. There is no bulk acceptance command. Behavior characterization and native evidence remain open and are filled before each migration slice.

The implementation adds two shared composition sites (INP-203/204) and five embedded workbench sites (WEB-INP-001–005). Current ledger: **204 native source sites across 93 files plus 5 web sites**. The AST snapshot separately retains 137 input-host references. No original site was dropped. `legacy-fill-consumers.csv` records 90 property references in 49 consumer files; the 50th lexical match is the token definition. Legacy values remain unchanged.

### Rich-notes and token-classification update

The ledger still has209 historical IDs. Current source has200 active native control sites plus137 host references.36 native rows are implemented awaiting native acceptance,164 remain planned,4 are removed/verified, including the unreachable Custom refine dialog. The5 web rows remain implemented awaiting runtime acceptance. The two link-dialog fields now use Input; the owned Pell renderer remains a narrow exception. Preview material is explicit until the six feature callers migrate in Task08.

All90 legacy token references are classified and reconciled against fresh source:13 text controls,6 field-like choice triggers,2 shared compatibility branches,1 clear action,1 choice popup,4 native choice groups,15 selection states,19 action states,28 content surfaces and1 slider track. The input/choice references must be resolved in their owning waves; classification alone does not mark those features migrated. The legacy rich-preview token use moved into the extracted internal `LongTextFieldPreview`; the90-reference count is unchanged. The50th lexical file is `packages/kwilt-tokens/src/colors.ts`, whose legacy token definitions retain their original values.

### Current convergence accounting

The ledger retains209 historical IDs (204 native +5 web). Three native rows now record removed implementations verified unused: INP-157, INP-175 and INP-176. Current AST controls:201, with137 host references separately recorded. Sixteen shared-composition controls and the twelve native pilot controls are explicitly migrated in source, with native evidence limits on each row. Read statuses and exceptions from the current ledger/baseline rather than the earlier snapshot counts above.

### Task05 account and Chore update

Current authoritative accounting:209 historical IDs, with50 native implemented awaiting native,150 planned,4 removed/verified and5 web implemented awaiting runtime. The14 new native rows cover Chore review/rate, sign-in/profile/Phone Agent, both destination search branches and two grouped notification choice triggers. Exactly14 legacy debt allowances were retired after review. Active ledger identities and multiplicities reconcile with200 native controls and137 separate host references. Native statuses remain nonterminal; source opt-in does not certify the broader acceptance matrix or authorize the global default switch.

The next11 ordinary form sites bring the current ledger to61 native implemented awaiting native,139 planned,4 removed/verified and5 web awaiting runtime. The200 active controls/137 hosts still reconcile exactly. Destination commands retain an explicit open issue: the historical Textarea alias does not enable multiline; material opt-in is not multiline acceptance.

Current adapter-wave accounting:69 native implemented awaiting native,131 planned,4 removed/verified and5 web awaiting runtime.200 active native controls and137 host references reconcile exactly; all209 historical IDs remain. Eight additional Task05 sites migrated with one narrow sentence-picker placement exception.

Current specialized-form accounting:77 native implemented awaiting native,123 planned,4 removed/verified and5 web awaiting runtime. All direct Task05 controls are source-migrated; INP-199 remains attached to the shared QuickAddDock migration. All209 historical IDs and the200-control/137-host exact reconciliation are retained.

### Task06 recipe editor and repeated rows

Four historical control sites now use shared Input: IngredientLineEditor, InstructionSectionEditor and RecipeEditScreen's AI draft plus seven-use Field adapter. Existing parent-owned row identity, callbacks, explicit Remove/Save and AI Apply-to-draft behavior remain. The shared field owns label and material once; yield widths/flex move to the container. Instruction and description/notes controls use capped multiline editing. Native long-text, keyboard and repeated-row acceptance remains open.

The original six RecipeEditScreen tests passed after migration. An additional behavior test verifies the second instruction keeps its stable id and complete multiline text when the first row is removed, without saving until Save is pressed. Scoped completion follows. Exactly four legacy debt entries are removed, with one reviewed Field prop-forwarding exception. The ledger has81 native awaiting native,119 planned,4 removed/verified and5 web awaiting runtime; all209 IDs and200 active controls/137 host references reconcile. Three obsolete legacy fieldFill consumers were removed from these exact files; the remaining87 references in46 consumer files match fresh source, with the token definition excluded and unchanged.

### Task06 cooking and meal feedback

Four additional controls migrate: used-instead value, substitution note, cooking note and optional meal hard-pass explanation. The fields keep their existing local state and explicit Done/Save actions. Cooking notes default to private; choosing a recipe-edit proposal retains the existing review step, with no automatic editing/publication. Hard-pass text keeps its140-character limit and trimmed Other-reason payload. Existing rating and card surfaces remain unchanged, including their legitimate legacy selection fill.

Current ledger:85 native implemented awaiting native,115 planned,4 removed/verified and5 web awaiting runtime. Four exact debt allowances were retired; all209 historical rows and200 active controls/137 hosts still reconcile. Native keyboard, long-text and surface-state acceptance remains open. Scoped verification follows in evidence.

### Task06 grocery, occasion and reminder forms

Five historical control sites now use Input: six store-opportunity fields, three grocery-edit fields, occasion date, reminder clock and trip target. Labels and material are owned once, while parent draft callbacks, decimal/time/date interpretation, explicit save/review actions and existing hosts remain. The grocery adapter has one exact reviewed prop-forwarding exception. No Money semantics, reminder, grocery update or real store opportunity was created during implementation.

Focused coverage passes across the four existing component suites. An overly broad style cleanup initially removed the reminder-builder parameter type; the focused test exposed it. The original signature was restored and only the obsolete style was removed. A direct source comparison verifies the complete reminder builder and scheduling functions are identical to HEAD; all three reminder tests pass. Scoped completion follows in evidence.

Current ledger:90 native awaiting native,110 planned,4 removed/verified and5 web awaiting runtime. Five exact debt allowances retired; all209 historical IDs and200-control/137-host identities reconcile. Three obsolete fieldFill input consumers were removed; the remaining84 references in45 consumer files match current source. Native keyboard, decimal/time/date and multi-field drawer acceptance remains open.

### Task06 remaining food controls

Nine remaining sites migrate: store search, meal suggestion, four plan-editor fields, URL/text recipe import, coverage name and custom food need. Search clears through the owned composition without performing retailer actions. Recipe import retains its mode-specific native props and explicit extraction/review flow; text mode uses a180-220 viewport. Plan count/date validation, local meal-note Add, food-need Return/Add and outer save actions remain unchanged. The sole coverage-name appearance style is removed after reference audit.

Three focused suites/28 tests pass, including a new assertion that clearing store search does not search, select a store or add to a cart. Current ledger:99 native implemented awaiting native,101 planned,4 removed/verified and5 web awaiting runtime. All Task06 sites are now source-migrated, while its native acceptance remains open. Nine exact debt allowances retired; all209 historical IDs and200 active controls/137 hosts reconcile. Four more obsolete input token consumers were removed;80 remaining references in44 consumer files match fresh source. Scoped completion follows in evidence.

### Task07 Money fields

Twelve remaining Money Input callers explicitly opt into unified material; four category SettingsTextInputRow callers are reviewed against their already-unified plain grouped adapter. The grouped presentation stays intact. Source review preserves category currency parsing, optional forecast money/day/month validation, allocation-plan validation, coverage rounding/clamping, note caps, saving locks and explicit review/save actions. Monthly category blur remains a preview, not a write. The previously repaired category-search host is unchanged by this slice.

A red/green scanner regression now recognizes SettingsTextInputRow as the owned canonical adapter while still rejecting caller appearance overrides. All19 scanner/policy tests pass. Four focused Money suites/33 tests pass. Exactly16 obsolete debt allowances are retired; all209 historical rows and200 active native controls/137 host references reconcile. Current ledger:115 native implemented awaiting native,85 planned,4 removed/verified and5 web awaiting runtime. No actual transaction, allocation, category, merchant rule or Money plan mutation was performed. Native amount error/empty/keyboard and full acceptance remain open; scoped completion follows in evidence.

### Task07 Games and Explore

Seven remaining Task07 sites migrate. Games names/code/answer use canonical fields while max lengths, ref forwarding, code normalization, submit guards, seat identity and explicit game actions remain. Setup's existing Remove button moves into Input's trailing slot, avoiding a nested field enclosure. Common Thread keeps its80-character local answer and explicit reveal/next flow. Its obsolete shared input/multiline styles were removed after reference audit. A replacement initially malformed the join name-ref type; focused tests caught the parse error and the original TextInput ref annotation was restored before passing tests.

Explore now uses SearchField for visited Places and Input for naming. The custom outer search box/icon and obsolete field styles are removed; nearby recommendations, map geometry, result-selection behavior and place persistence handlers remain unchanged. The expanded test confirms clear restores visited results without moving the map. Games focused tests pass20 cases and Explore passes39; a further seat-removal action regression is included in scoped verification.

All Task07 controls are source-migrated. Current ledger:122 native implemented awaiting native,78 planned,4 removed/verified and5 web awaiting runtime. Seven exact debt entries retired, all209 historical IDs retained,200 controls/137 hosts reconcile. Two obsolete Explore fieldFill uses removed;78 remaining token references in43 consumer files reconcile with source. Native Games keyboard/theme contrast and Explore map/drawer acceptance remain open. No real remote game, place visit, sharing or financial action was performed.

### Task08 rich-note callers and creation fields

All six LongTextField feature callers now explicitly select unified treatment. Activity detail/draft/peek and Arc/Goal creation use filled previews; Goal detail retains its documented flat/plain editorial presentation beside narrative content. Autosave900ms/zero-debounce behavior, local versus persisted draft ownership, disabled peek, AI callbacks, editor snap points and empty-value normalization remain unchanged. No shared editor, title or keyboard implementation was edited.

The scanner now requires explicit unified treatment for LongTextField callers during migration. Its new alias regression failed before the rule and passes afterward; all20 input-tooling tests pass. Existing rich-note material/behavior suites pass6 tests. Five additional creation fields converge: view name, Arc custom answers, Goal prompt/timeframe and invitation email. Question-title/recipient names are explicit, and Arc spacing belongs to the field container. Existing Goal/share suites pass8 tests; no goal, Arc, view or invitation was created or sent during verification.

Current ledger:133 native implemented awaiting native,67 planned,4 removed/verified and5 web awaiting runtime. Five exact creation-field debt entries retired; the six rich callers had no baseline allowances, so enforcement was strengthened rather than adding exceptions. All209 historical IDs and200 active controls/137 hosts reconcile. Native rich-editor/caller, plain Goal context, disabled peek and creation-flow acceptance remain open. Scoped completion follows in evidence.

### Task08 Activity and Goal standard pickers

Ten default picker callers now opt into unified filled treatment: Activity status/area/type, draft difficulty/area/type, AI Goal proposal Arc, Goal detail Arc/priority, and Goal creation Arc. Required selections retain their fallbacks; optional relations retain null normalization and clear behavior. Draft versus persisted callbacks, timestamps, disabled empty-Arc state, compact sizing and outer confirmation actions remain unchanged. Custom row triggers remain separately planned.

Current ledger:143 native implemented awaiting native,57 planned,4 removed/verified and5 web awaiting runtime. Ten exact legacy allowances retired; all209 historical IDs and200 active controls/137 hosts reconcile. Direct input policy passes337 sites. Scoped local verification passed36.41s (`/tmp/kwilt-pickers-local.log`): app/test types, architecture, code health, whitespace and2 suites/10 tests. The scope omitted292 other changed files and does not approve that work. Architecture retained10 warnings; no gate errors or stale marker. Native selection/clear, keyboard search and accessibility acceptance remain open. No Simulator, real Goal/Activity change or shared keyboard/title implementation was performed.

### Check-in, tag search and remaining textarea callers

Six sites migrate: tag search, check-in composer, check-in reply, pending draft editor, AI identity context and AI view customization. SearchField owns query clear/refocus while tag application remains separate. Check-ins use named canonical inputs with existing character limits and explicit Send; the compact composer no longer has a duplicate outer border, and its error uses shared field anatomy. Pending editing uses the contrasting fill on its muted card. Identity retains blur/back profile commit and empty-to-undefined normalization; AI customization retains its explicit Apply callback, loading lock and88-140 multiline range. Identity and check-in multiline editors have bounded180-point maximums. No service/persistence action was executed against a real account.

Acceptance review found a pre-existing pending-draft bug: Done displayed the original draft and a later Send discarded local edits. A failing regression reproduced it. Done/reopening now retain local text for explicit Send; parent draft id/text changes refresh local text. Two behavior tests cover edit retention and parent-draft replacement. This is a local editor correction, not a new save-on-Done behavior.

Current ledger:149 native implemented awaiting native,51 planned,4 removed/verified and5 web awaiting runtime. Six exact legacy allowances retired; all209 historical IDs and200 active controls/137 hosts reconcile. Direct input policy passes337 sites. Check-in/search scope passed35.89s (2 suites/2 tests, app/test types, architecture and code health; `/tmp/kwilt-checkin-local.log`,298 unrelated changed files omitted). Textarea scope passed24.68s (2 suites/2 tests, app types, architecture and code health; `/tmp/kwilt-final-textareas-local.log`,303 omitted). Final pending-draft correction passed27.46s (1 suite/2 tests, app/test types, architecture and code health; `/tmp/kwilt-pending-edit-local.log`,305 omitted). All three processes exited0, with10 retained architecture warnings and no stale marker. Whitespace passes. Native long text, compact/expanded contexts, accessibility and keyboard acceptance remain open. No Simulator/shared keyboard/title operation or integration/publication occurred.

### Chapter notes, inline view creation and reviewed adapter callers

Four controls migrate: inline AI view description, banner image search and Chapter personal/feedback notes. Inline view creation moves its sparkles and existing create/loading action into shared Input, removing the custom bordered enclosure; Go, ref/autofocus, trimmed callback and busy edit lock remain. Banner SearchField owns clear/refocus while existing Return/Search retains remote query behavior. Chapter editors retain personal-note Save/Cancel, feedback optional-save semantics, limits, ref and busy state; shared bounded multiline material replaces local styles. No Chapter service handler was changed.

Scoped local automation passed38.01s (`/tmp/kwilt-chapter-view-local.log`): app/test types, architecture, code health, whitespace and4 suites/19 tests, including an explicit-create regression. The scope omitted306 other changed files;10 existing architecture warnings remain. No stale marker or gate error. Four exact debt allowances retired. One obsolete inline-view fieldFill consumer removed; remaining77 references in42 files exactly match current source by file/token multiplicity.

Four already-canonical callers were separately reviewed: Activities layout/group FormFields retain segmented choice anatomy, and Arc/Goal creation titles retain EditableField's validation and local draft commits. They require no redundant opt-in or styling. Their source ASTs have zero override violations;2 shared-adapter suites/5 tests pass (`/tmp/kwilt-adapter-callers-focused.log`) covering changed-value commit once, rejected empty values, label/error and disabled semantics. No baseline allowances existed for these four callers.

Current ledger:157 native implemented awaiting native,43 planned,4 removed/verified and5 web awaiting runtime. All209 historical IDs remain;200 controls/137 hosts reconcile. Native Chapter long text, view/banner search keyboard, segmented controls and creation-title context acceptance remain open. No Simulator/shared keyboard/title implementation, remote image search, actual view creation or Chapter publication occurred.

### Reviewed store-finder export and obsolete Arc/Goal editors

The two store-finder callers now resolve as canonical composed inputs through an exact module/export registry. The existing SearchField, query callbacks, current-location behavior, explicit store choose and separate preferred-store action remain unchanged. Scanner regression covers aliases, rejects material overrides and a same-named unrelated wrapper, and still discovers raw controls inside the reviewed implementation. The fixture initially used a non-forwarding shape; it was corrected to the actual destructured-query pattern before passing19 scanner/policy tests. Two exact legacy-wrapper allowances retired. Scoped gate passed10.36s (`/tmp/kwilt-store-adapter-local.log`): app types, code health,2 suites/23 tests and script tests;310 other changed files omitted.

Removed two unreachable module-local implementations: ArcNarrativeEditorSheet and ArcSelectorModal. Whole-source references showed definitions only, with no caller/export or dynamic lookup. Their two historical control IDs remain removed-verified-unused. Removed the unused Arc editor state/imports and exclusive styles. The active GoalActivityComposerModal remains and now uses two canonical labeled fields, preserving open reset, title nonempty gate, type choice, optional note normalization and explicit Add. Its multiline note is capped120-180. Four exact legacy entries retired for these deletions/migrations.

The first automated check caught a duplicate Input import introduced in this slice; it was removed. Inventory reconciliation also detected a concurrent LongTextField list/link CSS update. The four CSS rules were reviewed, its already-updated owned-rich-editor exception was preserved, and INP-170's fingerprint was refreshed without changing that implementation or adopting a new native claim. The corrected final gate passed25.68s (`/tmp/kwilt-old-editors-final-local.log`): app types, architecture, code health, whitespace and5 suites/29 tests, process exit0 with no stale marker. Existing10 architecture warnings remain. The prior failed candidate is superseded, not counted as a pass.

Current ledger:161 native implemented awaiting native,37 planned,6 removed/verified and5 web awaiting runtime. All209 historical IDs retained;198 active native controls/137 hosts reconcile. Direct policy passes335 sites. Legacy material inventory still exactly matches77 references in42 files. Native Add To-do, store finder, broader editor acceptance, final default switch and integration remain open. No Simulator/title/keyboard source action, actual store change, Goal/To-do creation or publication occurred in this slice.

### Activity steps and custom relation rows

Six sites migrated: four existing/new Activity and draft step editors now explicitly use unified plain treatment and accessible names, with shared body typography replacing redundant local text/padding overrides. The detail step retains a single exact reviewed exception for completion color/strike-through; its parent style contains only those two semantic properties. Multiline expansion, existing viewport clamp, no nested scroll, single-line draft add, ref/testID, focus/blur and continue/exit commit callbacks remain unchanged. Removed now-unused step/new-step styles after reference audit. The linked-Goal and difficulty custom rows retain their navigation/choice composition while explicitly opting into canonical picker ownership; Goal relation search uses the shared material.

Scoped local automation passed40.71s (`/tmp/kwilt-step-inputs-local.log`): app/test types, architecture, code health, whitespace and11 suites/86 tests, including existing step-completion and picker coverage. Process exited0 without stale marker;10 existing architecture warnings remain. Six exact legacy allowances retired and one precise completion-text exception added. Current ledger:167 native implemented awaiting native,31 planned,6 removed/verified and5 web awaiting runtime. All209 historical IDs and198 active native controls/137 hosts reconcile; direct policy passes335 sites. Native long-step expansion, keyboard and custom-row acceptance remain open. No Simulator, title/keyboard implementation or actual Activity/Goal mutation occurred.

### AI Arc proposal fields

Three proposal fields now use canonical filled Input: Arc name, narrative and optional feedback note. Each has an accessible name; feedback label/material are owned once. Narrative and feedback retain their three-line minimum and use a180-point maximum. Existing local draft setters, Adopt Arc trim/fallback flow, Not now/reset, Save feedback payload and Cancel remain unchanged. Obsolete local typography/border/padding styles removed. Diff review caught an over-broad placeholder cleanup affecting a separate suggestion input; that input was restored before exact identity reconciliation and verification.

Scoped gate passed28.14s (`/tmp/kwilt-ai-proposal-local.log`): app types, architecture, code health, whitespace and1 related navigation suite/3 tests. This is source/static evidence, not an AI proposal interaction test. Process exited0 without a stale marker;10 existing architecture warnings remain. Three exact legacy entries retired; all209 historical IDs and198 active native controls/137 hosts reconcile. Current ledger:170 native implemented awaiting native,28 planned,6 removed/verified and5 web awaiting runtime. Native proposal editing, keyboard/long-text and explicit adoption/feedback acceptance remain open. No AI request, Arc adoption, feedback submission, Simulator or shared keyboard/title action occurred.

### Activity location trigger

The location Combobox now uses canonical PickerFieldTrigger for its selected preview, pin icon and clear action. Existing controlled query/search, result/current-location selection, preview/map movement, platform presentation, portal, radius and outer Save/Cancel remain. PickerFieldTrigger adds optional clearAccessibilityLabel with the unchanged Remove selection default; this caller retains Clear location. A regression failed before implementation and passes afterward, verifying the named clear callback and stopped propagation without opening the picker.

INP-092 is migrated; new explicit composition site INP-205 is appended without renumbering historical controls. Current accounting:210 historical rows,172 native implemented awaiting native,27 planned,6 removed/verified and5 web awaiting runtime. All199 active native controls/137 hosts reconcile, and policy passes336 sites. One obsolete location fill removed;76 remaining legacy references in41 files exactly match source. Scoped gate passed85.92s (`/tmp/kwilt-location-trigger-local.log`): app/test types, architecture, code health, whitespace and95 suites/620 tests. Process exited0 without stale marker. Native location/map/keyboard acceptance and integration remain open; no actual location persistence or Simulator operation occurred.

### Verification-command multiline acceptance correction

INP-192 used the Textarea alias without enabling multiline, despite promising one command per line. A failing rendered-field regression established that it rendered single-line. It now explicitly enables multiline88-180 and disables automatic capitalization/correction; existing command splitting, trimming, blank removal,20-command limit and explicit Install/Save persistence remain. The regression also verifies a two-line payload is saved as two separate commands only after Install, with no write on blur. Fixture corrections stabilized navigation and enabled the simulated Pro path; the initial failed fixture gate is superseded by the final candidate.

Final scoped automation passed25.97s (`/tmp/kwilt-command-lines-final-local.log`): app/test types, architecture, code health, whitespace and1 suite/1 behavior test. Process exited0 without stale marker;10 existing architecture warnings remain. No actual destination, subscription or command execution occurred. Counts remain172 native awaiting native,27 planned,6 removed/verified and5 web awaiting runtime across210 historical IDs;199 active controls/137 hosts reconcile. Native command-entry keyboard acceptance remains open.

The tag-entry audit confirms that INP-080/089 need one owned chip-and-text composition. Merely replacing their raw input would retain feature-local field fill, radius and padding. The next implementation must preserve wrapped chips, detail empty-state width, AI-autofill clearance, measured host/ref and focus behavior, comma/Done/blur commit semantics, and Backspace/removal semantics while moving material and the plain inner Input into a shared UI adapter. These sites remain planned; no partial migration is claimed.

### Shared tag-entry composition

Added Candidate TagEntryField: shared appearance resolver/InputFrame owns one filled chip surface and focus indicator, with one plain Input and removable chips inside. Native input callbacks and ref forward through the adapter; parsing and persistence stay in Activity callers. Both detail/draft tag entries now use it. Exact comparison verifies all prior native semantic props/callbacks, excluding replaced appearance props, are unchanged. Detail keeps its measured outer host, suggestion guard, Backspace removal, focus/reveal callbacks, test IDs and AI-autofill clearance. The AI-autofill block is preserved verbatim. Draft empty-space press now focuses its field. Chip removal stops propagation before calling its owner. Two tests cover native callback forwarding and isolated chip removal.

An initial typecheck exposed read-only ActivityPeekFields consumers of the shared tag styles. Those preview styles were restored, preserving the read-only surface. Their legacy token row now explicitly records content-preview use; editable tag copies no longer own field material. One precise internal native-prop forwarding exception was added; two legacy raw-input allowances were removed. Public TagEntryField props omit style/material and multiline overrides. Added its barrel export, Candidate inventory/guidance and a Forms/Editing/TagEntry Storybook specimen; no visual/native promotion is claimed.

Final scoped gate passed83.98s (`/tmp/kwilt-tags-final-local.log`): app/test types, architecture, code health, whitespace,92 suites/607 tests and script tests. Process exited0 without stale marker;308 other changed files were omitted and existing architecture warnings remain. Current ledger:211 historical rows,175 native implemented awaiting native,25 planned,6 removed/verified and5 web awaiting runtime. All200 native controls/137 hosts reconcile; policy passes337 sites. Legacy inventory exactly matches75 references in41 files, including the retained read-only preview. Native chip wrapping, tap targets, keyboard/caret, AI badge clearance, accessibility and Storybook visual review remain open. No Simulator, shared title/keyboard change, tag persistence or AI request occurred.

### AI target-date trigger and internal adapters

AI Goal proposals now use PickerFieldTrigger for the target date, replacing a custom Pressable/read-only Input and opacity override. Existing displayed date, inactive disabled state and native-picker toggle remain, with shared selected-value accessibility and no clear action. No date parsing or persistence changed. The remaining internal picker legacy branches are intentionally retained for Task10's default-switch gate.

The scanner now recognizes exact private module/name pairs for FilterDrawer ValueInput and PickerFields FixedSetPickerField, while still scanning their internals. A red/green regression covers both adapters and confirms unresolved forwarding remains visible. The filter dispatch already selects canonical fields; enum/small-set wrappers retain typed SinglePickerProps forwarding. Four exact legacy allowances retired; the two fixed-set forwarding sites receive precise owned-adapter exceptions, with public unified opt-in still enforced. No blanket module exclusion was introduced.

Final scoped gate passed52.52s (`/tmp/kwilt-internal-adapters-final-local.log`): app/test types, architecture, code health, whitespace,3 suites/14 tests and script tests. Direct scanner/policy tests pass20 cases. Process exited0 without stale marker;314 other changed files were omitted. The first command had selected a nonexistent .tsx test path and did not run checks; the corrected .ts path is included in the final gate. Current ledger:179 native implemented awaiting native,21 planned,6 removed/verified and5 web awaiting runtime, across211 historical IDs. All200 native controls/137 hosts reconcile; compatibility defaults and native/integration acceptance remain open. No actual Goal/date mutation or Simulator operation occurred.


### Regular AI chat composer

INP-105 now uses shared unified Input with composer material and a footer for feature-owned Expand and Send. The old feature border, shadow and placeholder typography are removed. Native ref/test ID, controlled draft, content-size expansion threshold, explicit Return/Send handler and sending/empty guards remain. Both footer actions now have44-point targets. The measured outer composer fence remains; the expanded editor is still INP-106 planned so its full-pane geometry can be preserved deliberately. Native acceptance must cover empty-surface focus, long text/caret, first-tap Send, expansion continuity and keyboard-open message clearance. No AI message was sent.

Scoped gate passed26.80s (`/tmp/kwilt-chat-composer-local.log`): app/test types, architecture, code health, whitespace and3 suites/15 tests; script checks passed31 cases. Focused shared-input/draft-storage tests passed12 cases. These are shared contracts and draft tests, not live chat interaction proof.317 other changed files are outside the gate;10 existing architecture warnings remain. No stale marker; process exited0. Current accounting:180 native implemented awaiting native,20 planned,6 removed/verified and5 web awaiting runtime across211 historical IDs. All200 active controls/137 hosts reconcile; one exact legacy allowance retired. Default-switch, remaining migrations and native/integration acceptance are still open. No Simulator or shared keyboard/title implementation changed.


### AI inline fields and rendered tag-entry refinement

INP-097/098/101 now explicitly use unified Input. Goal title retains titleMd and its existing hidden line-measurement/controlled draft behavior; Goal description uses plain small Input with the existing three-line minimum/220 maximum. The suggested To-do title retains its15pt semibold display role, native ref and Done/blur editing exit; Input owns platform metrics and material. Three legacy allowances retired. Two exact semantic typography exceptions preserve heading/item hierarchy, with no general feature styling exemption. Proposal confirmation and selection/create callbacks are unchanged. An intermediate review caught bodySm's14pt default;15pt was restored before final verification.

The real TagEntry Storybook specimen exposed long-chip overflow at393 points. A saved rendered regression check failed for overflow and undersized removal targets, then caught a shrinking close icon at320 points. The adapter now constrains chip width, wraps its label, reserves44-point targets and keeps the icon14 points. Red/green checks pass at320 and393 after fonts load. Browser interaction added Weekend via Enter and removed only that chip, restoring the original specimen; disabled controls expose disabled semantics. Captures: `storybook-tags-320.png` and `storybook-tags-393.png` in the input-unification evidence directory. Reproduce with Storybook Forms/Editing/TagEntry and `npx agent-browser --session kwilt-input-storybook eval --stdin < docs/design-system/evidence/input-unification/tag-entry-layout-check.js`. This is rendered web-composition proof, not native keyboard/accessibility acceptance. The dedicated browser and port6006 server were closed.

Final scoped gate passed69.83s (`/tmp/kwilt-ai-tags-final-local.log`), process exit0, not stale:95 suites/620 tests, app/test types, architecture, code health and whitespace.317 other changed files are outside scope;10 existing architecture warnings remain. A preceding run was marked stale after inputs changed and is superseded. Current ledger:183 native implemented awaiting native,17 planned,6 removed/verified and5 web awaiting runtime across211 historical IDs. All200 native controls/137 hosts reconcile. Remaining title/quick-add, expanded-editor, legacy-default, native and integration work remains open. No Simulator/shared title or keyboard implementation changed; no proposal was adopted or actual AI message sent.


### Expanded AI chat editor

INP-106 now renders shared unified plain Input inside the existing EditorSurface body. The host body reports its available height through onLayout; equal multiline minimum/maximum values let the input fill that space and scroll internally. No new keyboard-height offset, shared keyboard/title edit or EditorSurface change was introduced. The same controlled draft, ref, autofocus, Return-send handler and header Close/Send guards remain. Removed the redundant feature font/color/flex text style. A focused test confirms a long draft and native editor instance survive host shrink180/expand500 with the expected shared-input height, without a second content-size event. This proves the shared resize contract, not native caret behavior.

Final scoped local gate passed26.88s (`/tmp/kwilt-expanded-local.log`), process exit0 and not stale:3 suites/16 tests, app/test types, architecture, code health and whitespace; direct input policy passes337 sites. Current ledger:184 native implemented awaiting native,16 planned,6 removed/verified and5 web awaiting runtime across211 historical IDs. All200 controls/137 hosts reconcile; one exact raw-input allowance retired. Native expanded-editor caret/scroll, close-reopen draft continuity and first-tap Send remain open. No Simulator or actual message send occurred. QuickAdd still requires its own composition review; its checkbox, measured text growth and action row cannot be silently flattened into a generic field.


### QuickAdd adapter and all seven callers

INP-095 now uses unified plain Input within QuickAdd's established single white drawer surface. The existing test explicitly requires that surface treatment; the visual migration does not add a second filled box inside it. Checkbox, AI/action row, measured22-96 text growth, scroll threshold, focus/blur guard, empty Done collapse and one-create behavior remain. Matching min/max values retain the host-owned height; exact15pt semibold/22-line-height typography is the only retained input-style exception. UnderKeyboardDrawer/EditorSurface code and positioning were not changed. Native caret and first-tap action acceptance remain open.

Audited all seven callers without editing their callbacks: Chores opens an enriched local draft before separate commit; Groceries owns async add success/failure and dismissAfterSubmit false; Activities retains its controller/filter/receipt behavior; both Goal placements retain goal scope, order, chat and location actions; Plan recommendations and slot capture retain their forwarded quick-add models and separate scheduling decisions. INP-183/184/193/195/196/198/199 now record those boundaries. Duplicate Goal identities retain both census rows. The scanner recognizes only the exact owned QuickAdd module/name and continues to audit its internal Input; a red/green regression proves this. Eight legacy allowances retired and one precise semantic typography exception added.

Final scoped gate passed31.73s (`/tmp/kwilt-quick-add-local.log`), exit0 and not stale:9 suites/137 tests, app/test types, architecture, code health, whitespace and script tests. Focused QuickAdd/controller41 tests include submit-once/blur, empty submission, capability anatomy and measured drawer height. Direct scanner/policy21 tests pass.319 other changed files are outside scope;10 existing architecture warnings remain. Current accounting:192 native implemented awaiting native,8 planned,6 removed/verified and5 web awaiting runtime across211 historical IDs. All200 controls/137 hosts reconcile. No actual create/enrichment action, Simulator operation or shared title/keyboard implementation edit occurred. Native acceptance/default cleanup and integration remain open.


### Editorial title caller audit and remaining gates

INP-074/109/113 retain the existing shared NarrativeEditableTitle adapter with exact heading/host-spacing exceptions; no runtime source changed. Audited To-do titleLg/bold, centered Arc titleLg/display lineHeight46 and centered Goal titleLg roles, plus their existing trim/update/edit-state/validation callbacks. Three legacy allowances became reviewed editorial exceptions. The internal native title renderer INP-174 and controlled draft title INP-084 remain planned; this audit does not close their keyboard/caret work.

Scoped gate /tmp/kwilt-title-audit-local.log passed25.03s, exit0, not stale:1 suite/5 shared-title behavior tests, app/test types, architecture, code health and whitespace. Current census195 native source dispositions awaiting native,5 planned,6 removed/verified and5 web awaiting runtime;200 controls/137 hosts reconcile. See docs/design-explorations/input-unification/completion-gates.md for the exact remaining sites, ownership handoff and native/default/enforcement/integration gates. No Simulator or shared title/keyboard implementation edit occurred.


### Editorial title consolidation

Replaced the remaining two duplicate title renderers with owned `TitleInput`, retaining parent-controlled draft updates in ActivityDraftDetailFields and local validation/commit behavior in NarrativeEditableTitle. Draft title now has the stable accessible name “To-do title”. Existing heading styles, Return policies and content-size reveal callback remain at their owners. The shared renderer has no paragraph height minimum/cap or internal scrolling. Its exact native exception is INP-207; the two callers retain narrow editorial typography exceptions, replacing three historical baseline allowances. Scanner regression ensures title aliases are recognized while the native implementation remains scanned.

Current census:212 historical IDs,198 native implemented-awaiting-native,3 native planned,6 verified removals and5 web awaiting runtime.201 active native controls plus137 hosts =338 AST sites, exact identity/multiplicity reconciliation. Also reconciled the keyboard task’s reviewed wrapperStyle and Areas submit changes; no callbacks were changed by reconciliation.

Scoped `/tmp/kwilt-title-consolidation-local.log` passed36.22s, exit0: app/test types, architecture, code health, whitespace,2 Jest suites/6 tests and44 script tests. Scoped evidence does not approve unrelated dirty work or integration.

Native observation: existing iPhone17Pro/iOS26.5 development shell, same main checkout/HEAD9baf1a4 plus dirty source via Metro8081. After the chat task was confirmed completed, opened persisted reminder To-do title, entered a temporary local539-character draft, positioned the cursor after “Visible ending”, and captured `native-title-long.png`: ending caret is above the keyboard and Done stays visible. Automated type_text did not visibly insert the requested marker, so insertion/selection editing is not certified. Restored the exact original title before first-tap Done; keyboard dismissed and editing ended. No temporary title was intentionally committed. This is narrow native evidence, not full editorial acceptance; draft-title, other hosts, Dynamic Type and platform coverage remain open.


### Relation search renderer retirement

Removed INP-180, the compatibility-only raw TextInput branch and its unused styles. Existing SearchField is now the sole relation-query renderer regardless of trigger treatment. Query state, normalization, filtering, recommended options, close reset and selection callback remain unchanged. The new regression fails on the old branch’s missing accessible query/clear and passes after consolidation:11 focused picker/search tests.

Native iPhone17Pro/iOS26.5, existing development shell and current dirty main/9baf1a4 source via Metro8081: opened Change linked goal, entered desk, observed only the matching goal, cleared in one tap with keyboard remaining open, re-entered query, closed in one tap and reopened to an empty query/all options. Closed without selecting; original linked goal remained visible. Captures native-relation-filter.png and native-relation-reset.png. No real selection/persistence mutation was performed; one selection callback is covered by the regression. Wider accessibility/platform acceptance remains open.

Census212 historical rows:198 native awaiting acceptance,2 planned forwarding/default sites,6 unused removals,1 consolidated removal and5 web awaiting runtime.200 active controls+137 hosts=337 exactly reconciled sites. Initial scoped automation passed its checks but was marked stale as checkout inputs changed during the run; it is not a stable-candidate pass. Fresh gate follows after artifact writes.


### Picker forwarding audit

Current AST has30 external picker-family calls; all explicitly pass unified, and fieldVariant is either absent or filled. Custom triggers remain at their original owners. FixedSetPickerField now passes only the named trigger contract (value/options/placeholder/accessibility/size/icon/variant/treatment/surface and owned open/clear handlers), replacing its broad props spread. RelationPickerField already forwards that contract explicitly. Neither adapter changes controlled/uncontrolled open, optional deselect or selection callbacks.

INP-178/179 now have implemented-awaiting-native dispositions and exact temporary forwarding exceptions, with Task10 removal conditions. The old migration-debt sites array is empty; this does not mean full acceptance or completion.212 historical rows:200 native awaiting acceptance,5 web awaiting runtime,6 unused removals and1 consolidated removal.337 active AST sites reconcile exactly. Both Input and picker defaults still have legacy compatibility; Task10 removes this after completion of the caller-acceptance gate. Existing focused picker/search coverage passes11 tests.


### Canonical default and API retirement

Input, picker triggers and rich-note previews now default to the filled/flat/body-text/neutral-label treatment. Removed InputTreatment, JSX migration flags, legacy frame/preview renderers, surface/ghost input variants and elevated input type support. Plain/inline/editorial and explicit outline choices remain. Native editing/ref/events and caller persistence callbacks were retained. Existing callers had already opted into unified; the final source reconciliation checked337 sites with exact multiplicity and only the expected attribute/shared-renderer changes. Unrelated feed-card and financial treatment concepts remain intact. The source cleanup proceeded after completed caller-source coverage; full native acceptance remains a separate gate, and this does not assert those pending rows are accepted.

Architecture policy now rejects removed treatment props through the same alias/spread-aware scan; no migration debt remains, with30 exact owned/semantic exceptions retained. Those exceptions still require final acceptance review. Storybook source/examples and current authoring guidance use the new API. Removed two dead compatibility uses of fieldFill;73 existing non-input/action references across39 files remain, matched to the legacy-token ledger.

Verification: `/tmp/kwilt-default-switch-local.log` passed112.69s, exit0 and not stale;96 selected files,272 other changed files omitted. App/test types,architecture,health,whitespace,131 related Jest suites/816 tests and script checks pass. Focused default/editor/picker/rich suites pass25 tests. Initial implementation failures (remaining preview references and legacy viewport expectations) were resolved; the first gate caught a trailing blank line and the stable run supersedes it.

Material export --check and native/site JSON cmp both passed. Provenance: native main9baf1a4a8e14b83e806c1df9e25ee4d3e66d0678 plus dirty source; site a5e46fb3d4053ab458d6bf8aa54d3da48fb7819a plus its existing work. No deployment or integration gate claimed.

Post-switch native Places search shows the same filled/focused geometry and visible caret/results as the prior capture: `native-default-places-search.png`, current Metro source in the existing iPhone17Pro/iOS26.5 development shell. One attempted row navigation did not yield a confirmed selected-place route, so that remains open. Full Dynamic Type/contrast/assistive/platform, ordinary-form/composer/default-switch representatives, rich editing and embedded-host acceptance still require completion. Source migrations/API cleanup are not full-plan completion.
