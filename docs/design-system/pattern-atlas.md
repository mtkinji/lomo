# Kwilt UI Pattern Atlas

The atlas governs how canonical primitives compose into coherent Kwilt surfaces. A component story proves a component; an atlas entry proves hierarchy, relationships, and use in context.

## Maturity

| Status | Meaning |
| --- | --- |
| Canonical | Default composition for the documented job. |
| Candidate | Useful precedent that still needs rendered review or state coverage. |
| Local | Capability-owned composition; do not generalize it. |
| Missing | No approved pattern yet; design and review before feature implementation. |

## Initial Atlas

These entries establish the picking order without pretending every current surface has completed visual review.

No reusable composition is Canonical yet. This is intentional: the first promotion requires an explicit product/design-owner decision after rendered comparison and state review. Until then, Candidate entries guide implementation and must receive surface-specific visual acceptance.

| Job / surface | Start from | Current status | Required hierarchy |
| --- | --- | --- | --- |
| Settings | `SettingsPage`, `SettingsGroup`, `SettingsRow`, `SettingsToggleRow`, `SettingsDivider` in `src/ui/SettingsSurface.tsx`; `Settings/Patterns` Storybook | Candidate | Page title, groups, then rows; destructive actions last and quiet until chosen. |
| Inventory / list | `PageHeader`, `InventoryControlGroup`, domain row component, `CanvasFlatList` | Candidate | Orientation and primary create action, controls, then scannable content. Avoid one Card per row unless the item needs a surface boundary. |
| Object detail | `ObjectPageHeader`, `CanvasScrollView`, domain sections, `KeyActionsRow` where appropriate | Candidate | Identity and current state, next useful action, then supporting detail. |
| Edit / create | `PageHeader` or `BottomDrawerHeader`, canonical fields, `BottomDrawerFooter` or one page action | Candidate | Object identity, required fields, optional fields, one completion action. |
| Small-set choice | `EnumPickerField` or `SmallSetPickerField` with `BottomDrawer` | Candidate | Current value, concise choices, selected state; no duplicate Save when selection is immediate. |
| Searchable relation choice | `RelationPickerField` / `ObjectPicker` | Candidate | Search, results, selected relationship, clear empty state. Presentation remains scope-sensitive. |
| Contextual menu | `DropdownMenu` and title-adjacent three-dot trigger | Candidate | Current surface remains primary; menu contains low-frequency actions without becoming a second navigation system. |
| Confirmation | `Dialog`; destructive semantics must be explicit | Candidate | Consequence, destructive action, safe cancel. Do not confirm harmless reversible actions. |
| Empty / permission / failure | `EmptyState`, `Dialog`, or inline feedback according to interruption cost | Candidate | What happened, what can be done now, one recovery action. Illustration remains secondary. |
| Focused emotional moment | Capability-local full-screen composition using tokens and canonical actions | Local | One message and one action; illustration supports rather than competes. |

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
ShadCN reference:
Kwilt localization:
Last reviewed:
```

The rendered reference is part of the contract. Code paths alone are not visual proof.

## Picking Rule

Use the closest Canonical atlas entry first. If none exists, use a Candidate only as a precedent, write the intended hierarchy and differences, render it, and seek visual acceptance before calling the composition canonical. Never assemble a screen by choosing individually valid components without naming the composition pattern they form.
