# Kwilt UI Pattern Atlas

The atlas governs how Canonical primitives compose into coherent Kwilt surfaces. A component story proves a component; an atlas entry proves hierarchy, relationships, and use in context.

## Maturity

| Status | Meaning |
| --- | --- |
| Canonical | Default composition for the documented job. |
| Candidate | Useful precedent that still needs rendered review or state coverage. |
| Local | Capability-owned composition; do not generalize it. |
| Missing | No approved pattern yet; design and review before feature implementation. |

Bottom Dock Geometry is the first Canonical reusable composition. Andrew approved its promotion on 2026-08-17 after repeated phone-shell review and accepted Conversation Mode comparison. Other Candidate entries still require surface-specific visual acceptance.

## Canonical Patterns

### Secondary Settings Page

Job: When a person opens a pushed management page within a top-level capability or Settings, they need to stay oriented while scanning related controls as one familiar system.

Status: Canonical. Explicit product/design-owner approval: Andrew, 2026-08-27.

Approved routes: Pushed second-level management pages, including Screen Time inventory and rule detail, Money app-control rule detail, and equivalent Settings destinations. Top-level capability landing pages are excluded.

Rendered references: Screen Time inventory and Shopping app-controls Simulator references reviewed 2026-08-27. The Screen Time reference establishes the correction target; Shopping app controls establishes the accepted compact-header and gray-canvas precedent.

Three-second read: A compact centered destination title, a back path, and grouped white management cards on the gray application shell.

Scan order: Destination title -> current access or object state -> tightly labeled management groups -> rows and disclosure destinations -> optional completion action.

Primary action: The one capability-owned management action for the current level, such as Add rule or Save changes. A list row opens its detail; it does not skip directly into one field editor.

Anatomy: `SettingsPage` owns the gray `shellAlt` canvas, compact centered title under the safe area, 44pt back target, scrolling content, and standard group spacing. `SettingsGroup` owns a label immediately above one white rounded card and may carry one quiet header action. Rows use one consistent list anatomy: title, supporting outcome/context where needed, current state, and disclosure when the row opens detail.

Canonical components: `SettingsPage`, `SettingsGroup`, `SettingsRow`, `SettingsDetailRow`, `SettingsToggleRow`, and `SettingsDivider` in `src/ui/SettingsSurface.tsx`.

States: Loading, empty, populated, disabled/unavailable, enabled, and pressed. Empty collections remain inside the same white group surface. Enabled state belongs in rule detail unless a list is explicitly designed as a direct-control list; one list must not mix direct toggles and disclosure rows for equivalent objects.

Responsive and accessibility behavior: The centered title remains centered independent of back-button width. Back and header actions retain 44pt targets. Detail rows expose title, concrete behavior, owner/context, and On/Off state in one spoken label. Supporting copy wraps under Dynamic Type rather than truncating the rule's meaning.

Allowed variations: A group may omit its label, include a quiet footer, or expose one trailing header action. Capability-owned condition editors may use drawers or deeper pages, but return to the same rule-detail grammar.

Do not use when: The page is a top-level capability landing page, an initial immersive onboarding step, a focused emotional moment, or a platform-owned picker. Do not use a large leading `PageHeader` on a pushed secondary page; do not use a white page canvas; do not place section labels far from their cards; and do not make an object row jump directly into an arbitrary field editor.

RNR reference: Localized Kwilt Settings components remain authoritative for control anatomy and tokens.

External-exemplar preserve/translate/reject ledger: Preserve the clarity of native grouped settings and compact navigation titles; translate them through Kwilt typography, gray shell, white cards, and capability language; reject copied platform chrome, inset-table pixel matching, and mixed row behaviors.

Kwilt localization: Capability owners define rule conditions and outcome copy. The shell, hierarchy, row grammar, and transition from inventory to full detail remain shared.

Last reviewed: 2026-08-27.

### Bottom Dock Geometry

Job: When the current action must remain available at the bottom of a phone surface, the user needs it to feel deliberately nested inside the device rather than attached with arbitrary padding, so it remains reachable without colliding with the home indicator, keyboard, tab bar, or content.

Status: Canonical. Explicit product/design-owner approval: Andrew, 2026-08-17; resting floating-control refinement approved 2026-08-25.

Approved routes: `ActionDock` and `SplitActionDock` phone-floating controls; `FullWidthActionDock` for one persistent full-width page button; `BottomDrawer.footer` for bounded completion; `BottomDrawer.actionDock` with `DrawerDestinationAction` for a persistent next destination; Unified Chat Conversation Mode composer states.

Rendered references: `artifacts/conversation-mode/listening-nested-improved.png`; `artifacts/bottom-dock/activity-schedule-full-width-action.png`; To-dos inventory resting dock; Activity Detail next-action dock; accepted iPhone 17 Pro web composer proof with approximately 21px visible side and 22px visible bottom gaps; iPhone 17 Pro native drawer proof with a 24pt visible inline gap and full home-indicator clearance.

Three-second read: One current action is visibly anchored to the surface and balanced within the phone's lower corner geometry.

Scan order: Current decision context -> one bottom action region -> surrounding safe space.

Primary action: The capability-owned current action. Geometry never invents, duplicates, or changes the action.

Anatomy: Capability-owned content inside either a resting floating-control frame, a full-width phone-floating frame, a semantic drawer footer, or a drawer action-dock frame. The frame owns inline gap, bottom gap, safe-area policy, keyboard relationship, and content clearance. A drawer footer keeps its optional secondary action before the primary in one intrinsic, trailing horizontal group; it does not stretch the actions into equal columns. It is an attached, edge-to-edge surface with an always-on, subtle upward elevation and separately inset action content, not a floating dock. A single drawer destination floats over the workspace and uses the standard centered leading-icon-and-label button anatomy. Resting floating controls use the To-dos inventory's 32pt inline and 32pt compact-bottom corner nesting. Detail action docks keep the recommended split action intrinsically sized, preserve deliberate open space, and isolate completion or contextual status on the opposite edge. Inventory docks may let their capture or search surface fill the remaining row before fixed circular utilities.

Canonical components: `ActionDock`, `SplitActionDock`, `FullWidthActionDock`, `BottomDrawer.footer`, `BottomDrawer.actionDock`, `BottomDrawerSemanticFooter`, and `DrawerDestinationAction`. `bottomAccessory` remains a low-level compatibility seam. Geometry tokens live in `@kwilt/tokens/bottomDock`: `restingFloatingControl` governs inventory and detail floating controls, while `phoneFloating` retains the narrower full-width page-action geometry.

States: Resting, pressed, disabled, loading, keyboard open, no home indicator, home indicator present, and capability-owned state transitions such as Conversation Mode listening/thinking/speaking/recovering. State changes replace content without moving the outer frame.

Responsive and accessibility behavior: Resting inventory and detail controls use 32pt inline and compact-bottom gaps. Full-width phone-floating page actions use a 24pt inline optical gap and target at least a 20pt bottom gap, with a partial safe-area lift where needed. Semantic drawer footers use a 24pt inline gap and the full bottom safe-area inset. Drawer destination docks float with 32pt inline and bottom corner nesting; their standard full-width destination button is 44pt high, and scroll content reserves the component-provided clearance rather than feature-owned numbers. All use 12pt content separation. Controls retain 44pt minimum targets, Dynamic Type support, and Reduce Motion behavior. Keyboard and tab-bar collision checks are mandatory.

Allowed variations: Floating versus drawer-contained anatomy; intrinsic detail action versus flexible inventory action versus one full-width page action; quiet top divider when scroll content needs separation; platform safe-area expansion. A persistent full-width page button uses `FullWidthActionDock` rather than screen-owned bottom padding. Intrinsic detail actions do not expand merely to occupy the row. Visual materials and action semantics remain component-owned.

Do not use when: The action is not persistent, the drawer action naturally belongs in scrolling content, a platform-native bar owns the placement, or persistence would duplicate a nearby primary action. Do not pass numeric placement overrides from feature code.

RNR reference: Localized Kwilt `Button` anatomy remains authoritative for the control. No upstream layout primitive supersedes this phone-shell contract.

External-exemplar preserve/translate/reject ledger: Preserve the calm corner balance of accepted mobile precedents; translate it through Kwilt tokens and safe-area behavior; reject traced device pixels, copied control anatomy, and per-screen spacing guesses.

Kwilt localization: This is an optical contract, not a demand that every bottom action look alike. Conversation Live Dock, action docks, and full-width drawer buttons share placement while retaining their own semantics and state presentation.

Last reviewed: 2026-08-25.

### Capability Onboarding Step

Job: When a capability asks for one setup decision or reports one setup phase, the user needs a
friendly, stable full-screen frame whose visual anchors do not jump between steps.

Status: Canonical. Explicit product/design-owner approval: Andrew, 2026-08-20.

Approved routes: Sequential capability-owned setup moments after a value-door introduction and
before entry into the application page. Money Target, Connect, Analyze, and Ready are the first
accepted implementation.

Three-second read: One setup moment, one grounded illustration, one decision or truthful status,
and at most one persistent action.

Scan order: Fixed logo/counter/close chrome -> centered two-line title region -> fixed illustration
anchor -> vertically centered decision or status -> canonical full-width action dock.

Anatomy: `CapabilityOnboardingStepScreen` owns the Parchment canvas, a 44pt top-chrome row, a
112pt minimum title slot using `titleMd`, a 232pt illustration slot, a flexible centered decision
slot, safe-area-aware scroll clearance, and `FullWidthActionDock`. Capability code does not replace
these dimensions or recreate the shell.

State continuity: Meaningfully different steps use distinct illustrations within one character,
setting, and rendering family. Transient substates of one step retain that step's illustration so
the dominant visual anchor does not move. External flows such as Plaid are temporary excursions;
their preparation, return, exchange, cancellation, and recovery remain owned by the same step.

Responsive and accessibility behavior: Titles reserve two lines even when copy uses one. Content
may scroll at enlarged text sizes without moving the action into scroll content. The counter has a
spoken capability-specific label, close remains a 44pt target, images have semantic labels, status
changes use live regions, and Reduce Motion follows the canonical loader and button behavior.

Do not use when: The capability is still making its value promise, the user has already entered a
native application page, multiple independent decisions are required, or the moment is better
served by an inline empty state. Do not add a progress track, cards, page chrome, floating gauges,
ambiguous physical objects, or a second primary action.

Last reviewed: 2026-08-20.

## Initial Atlas

| Job / surface | Start from | Status | Required hierarchy |
| --- | --- | --- | --- |
| Settings | Canonical Secondary Settings Page for pushed management pages; `Settings/Patterns` Storybook for remaining top-level and modal settings work | Candidate | Match navigation depth first; then page title, groups, and rows. Destructive actions remain last and quiet until chosen. |
| Inventory / list | `PageHeader`, `InventoryControlGroup`, domain row component, `CanvasFlatList` | Candidate | Orientation and primary create action, controls, then scannable content. Avoid one Card per row unless the item needs a surface boundary. |
| Object detail | `ObjectPageHeader`, `CanvasScrollView`, domain sections, `KeyActionsRow` where appropriate | Candidate | Identity and current state, next useful action, then supporting detail. |
| Edit / create | `PageHeader` or `BottomDrawerHeader`, Canonical fields, `BottomDrawerFooter` or one page action | Candidate | Object identity, required fields, optional fields, one completion action. |
| Dialog form | `Dialog` anatomy plus `Input` or `FormField` | Candidate | Title/description, coherent fields, one submit action, quiet cancel. |
| Consequential confirmation | `AlertDialog` | Candidate | Consequence, destructive action, safe cancel. No dismissal ambiguity. |
| Small-set choice | `EnumPickerField` or `SmallSetPickerField` with `BottomDrawer` | Candidate | Current value, concise choices, selected state; no duplicate Save when selection is immediate. |
| Searchable relation choice | `RelationPickerField` / `ObjectPicker` | Candidate | Search, results, selected relationship, clear empty state. Presentation remains scope-sensitive. |
| Contextual menu | `DropdownMenu` and title-adjacent three-dot trigger | Candidate | Current surface remains primary; low-frequency actions are grouped and destructive actions are last. |
| Empty / permission / failure | `EmptyState`, `Dialog`, or inline feedback according to interruption cost | Candidate | What happened, what can be done now, one recovery action. Illustration remains secondary. |
| Focused emotional moment | `CapabilityOnboardingStepScreen` for sequential setup; capability-local composition for one-off moments | Candidate | One message and one action; illustration supports rather than competes. |

## Airbnb-informed Candidate Patterns

These patterns were extracted from the [August 2026 Airbnb mobile listing-detail study](references/airbnb-mobile/listing-detail-2026-08/pattern-extraction.md). Airbnb is evidence, not implementation authority; the rows below are Kwilt Candidate precedents and still require surface-specific acceptance.

| Job / composition | Start from | Required hierarchy | Exclusions |
| --- | --- | --- | --- |
| Narrative object detail | `ObjectPageHeader`, `CanvasScrollView`, flat domain sections | Identity/current state -> decision-critical summary -> supporting detail | No copied listing order, media-sheet silhouette, or decorative card stack. |
| Iconographic facts list | `Icon`, `Typography`, tokenized row layout | Section purpose -> concise labeled facts -> specific show-all action if needed | No traced glyphs, mixed decorative emoji system, or icon-only facts. |
| Compact evidence summary | `Typography`, semantic status/provenance components | Most decision-relevant truthful signal -> supporting signals -> explanation on request | No invented scores, trust badges, or equal emphasis for every metric. |
| Progressive section reveal | Flat section plus quiet disclosure action | Representative content -> truthful count/state -> optional full detail | Do not hide decision-critical information or use disclosure to repair weak grouping. |
| Horizontal evidence rail | Accessible horizontal list plus complete item anatomy | Section purpose -> independently legible items -> explicit full-list path when needed | No required sequence, inaccessible traversal, or clipped essential content. |
| Persistent decision region | Canonical Bottom Dock Geometry plus one primary `Button` | Decision context -> one current action; body remains readable above it | No duplicate primary action, tab-bar collision, keyboard obstruction, or screenshot-derived persistence. |
| Person/contributor summary | `Avatar`, `Typography`, truthful relationship/provenance fields | Identity -> relevant relationship or proof -> deeper detail | No host-card clone, copied verification badge, or metrics without product authority. |

## Entry Contract

Promote an atlas entry to Canonical only when it records:

```markdown
Job:
Status:
Approved routes:
Rendered references:
Three-second read:
Scan order:
Primary action:
Anatomy:
Canonical components:
States:
Responsive and accessibility behavior:
Allowed variations:
Do not use when:
RNR reference:
External-exemplar preserve/translate/reject ledger:
Kwilt localization:
Last reviewed:
```

The rendered reference is part of the contract. Code paths alone are not visual proof.

## Picking Rule

Use the closest Canonical atlas entry first. If none exists, use a Candidate only as a precedent, name the intended hierarchy and differences, render the real surface, and obtain surface-specific visual acceptance. Never assemble a screen from individually valid components without naming the composition pattern they form.
