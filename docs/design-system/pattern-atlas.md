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

### Bottom Dock Geometry

Job: When the current action must remain available at the bottom of a phone surface, the user needs it to feel deliberately nested inside the device rather than attached with arbitrary padding, so it remains reachable without colliding with the home indicator, keyboard, tab bar, or content.

Status: Canonical. Explicit product/design-owner approval: Andrew, 2026-08-17.

Approved routes: `ActionDock` and `SplitActionDock` phone-floating controls; `BottomDrawerFooter`; `BottomDrawer.bottomAccessory` when it contains a fixed full-width drawer action; Unified Chat Conversation Mode composer states.

Rendered references: `artifacts/conversation-mode/listening-nested-improved.png`; `artifacts/bottom-dock/activity-schedule-full-width-action.png`; accepted iPhone 17 Pro web composer proof with approximately 21px visible side and 22px visible bottom gaps; iPhone 17 Pro native drawer proof with a 24pt visible inline gap and full home-indicator clearance.

Three-second read: One current action is visibly anchored to the surface and balanced within the phone's lower corner geometry.

Scan order: Current decision context -> one bottom action region -> surrounding safe space.

Primary action: The capability-owned current action. Geometry never invents, duplicates, or changes the action.

Anatomy: Capability-owned content inside either a phone-floating frame or a fixed drawer-action frame. The frame owns inline gap, bottom gap, safe-area policy, keyboard relationship, and content clearance.

Canonical components: `ActionDock`, `SplitActionDock`, `BottomDrawerFooter`, and `BottomDrawer`'s `bottomAccessory` region. Geometry tokens live in `@kwilt/tokens/bottomDock`.

States: Resting, pressed, disabled, loading, keyboard open, no home indicator, home indicator present, and capability-owned state transitions such as Conversation Mode listening/thinking/speaking/recovering. State changes replace content without moving the outer frame.

Responsive and accessibility behavior: Phone-floating controls use a 24pt inline optical gap and target at least a 20pt bottom gap, with a partial safe-area lift where needed. Fixed drawer actions use a 24pt inline gap, 12pt content separation, and at least 20pt below, expanding to the full bottom safe-area inset. Controls retain 44pt minimum targets, Dynamic Type support, and Reduce Motion behavior. Keyboard and tab-bar collision checks are mandatory.

Allowed variations: Floating versus drawer-contained anatomy; one full-width action versus a capability-owned split action; quiet top divider when scroll content needs separation; platform safe-area expansion. Visual materials and action semantics remain component-owned.

Do not use when: The action is not persistent, the drawer action naturally belongs in scrolling content, a platform-native bar owns the placement, or persistence would duplicate a nearby primary action. Do not pass numeric placement overrides from feature code.

RNR reference: Localized Kwilt `Button` anatomy remains authoritative for the control. No upstream layout primitive supersedes this phone-shell contract.

External-exemplar preserve/translate/reject ledger: Preserve the calm corner balance of accepted mobile precedents; translate it through Kwilt tokens and safe-area behavior; reject traced device pixels, copied control anatomy, and per-screen spacing guesses.

Kwilt localization: This is an optical contract, not a demand that every bottom action look alike. Conversation Live Dock, action docks, and full-width drawer buttons share placement while retaining their own semantics and state presentation.

Last reviewed: 2026-08-17.

## Initial Atlas

| Job / surface | Start from | Status | Required hierarchy |
| --- | --- | --- | --- |
| Settings | `SettingsPage`, `SettingsGroup`, `SettingsRow`, `SettingsToggleRow`, `SettingsDivider` in `src/ui/SettingsSurface.tsx`; `Settings/Patterns` Storybook | Candidate | Page title, groups, then rows; destructive actions last and quiet until chosen. |
| Inventory / list | `PageHeader`, `InventoryControlGroup`, domain row component, `CanvasFlatList` | Candidate | Orientation and primary create action, controls, then scannable content. Avoid one Card per row unless the item needs a surface boundary. |
| Object detail | `ObjectPageHeader`, `CanvasScrollView`, domain sections, `KeyActionsRow` where appropriate | Candidate | Identity and current state, next useful action, then supporting detail. |
| Edit / create | `PageHeader` or `BottomDrawerHeader`, Canonical fields, `BottomDrawerFooter` or one page action | Candidate | Object identity, required fields, optional fields, one completion action. |
| Dialog form | `Dialog` anatomy plus `Input` or `FormField` | Candidate | Title/description, coherent fields, one submit action, quiet cancel. |
| Consequential confirmation | `AlertDialog` | Candidate | Consequence, destructive action, safe cancel. No dismissal ambiguity. |
| Small-set choice | `EnumPickerField` or `SmallSetPickerField` with `BottomDrawer` | Candidate | Current value, concise choices, selected state; no duplicate Save when selection is immediate. |
| Searchable relation choice | `RelationPickerField` / `ObjectPicker` | Candidate | Search, results, selected relationship, clear empty state. Presentation remains scope-sensitive. |
| Contextual menu | `DropdownMenu` and title-adjacent three-dot trigger | Candidate | Current surface remains primary; low-frequency actions are grouped and destructive actions are last. |
| Empty / permission / failure | `EmptyState`, `Dialog`, or inline feedback according to interruption cost | Candidate | What happened, what can be done now, one recovery action. Illustration remains secondary. |
| Focused emotional moment | Capability-local full-screen composition using tokens and Canonical actions | Local | One message and one action; illustration supports rather than competes. |

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
