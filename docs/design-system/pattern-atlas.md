# Kwilt UI Pattern Atlas

The atlas governs how Canonical primitives compose into coherent Kwilt surfaces. A component story proves a component; an atlas entry proves hierarchy, relationships, and use in context.

## Maturity

| Status | Meaning |
| --- | --- |
| Canonical | Default composition for the documented job. |
| Candidate | Useful precedent that still needs rendered review or state coverage. |
| Local | Capability-owned composition; do not generalize it. |
| Missing | No approved pattern yet; design and review before feature implementation. |

No reusable composition is Canonical yet. This is intentional: the first promotion requires an explicit product/design-owner decision after rendered comparison and state review. Until then, Candidate entries guide implementation and must receive surface-specific visual acceptance.

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
| Persistent decision region | Existing dock/footer and one primary `Button` | Decision context -> one current action; body remains readable above it | No duplicate primary action, tab-bar collision, keyboard obstruction, or screenshot-derived persistence. |
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
