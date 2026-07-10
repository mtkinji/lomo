# Picker Guidance

Pickers are a two-part pattern: the closed trigger field and the open selection surface.

Kwilt Goals should be the canonical source for picker triggers because it already has a reusable picker family:

- `EnumPickerField` for small fixed sets.
- `SmallSetPickerField` for compact predictable choices.
- `RelationPickerField` for searchable object lists.

Kwilt Money can influence picker content, especially for finance-specific classification, but it should not define a separate closed-field grammar for category selection.

## Canonical Principle

One trigger grammar. Multiple selection surfaces.

The shared package should eventually own:

- Picker trigger anatomy: label lives outside the field, value inside the field, trailing affordance, optional leading icon, optional clear action.
- Picker trigger states: empty, selected, disabled, error, focused/open.
- Small fixed-set picker surface: compact drawer with selectable rows.
- Searchable choice picker surface: drawer or full-screen relation picker depending on list size and device.

Apps should keep local:

- Domain-specific option labels, icons, emojis, hints, and ordering.
- Category intelligence, suggestions, transaction meaning, and rule-building behavior.
- Product copy around the picker.

## Closed Trigger

Use the Goals picker trigger as the default:

- Outside label in the surrounding form section.
- Full-width field.
- Selected value as the primary text.
- Trailing `chevronsUpDown` or `chevronDown` affordance.
- Optional clear action when deselection is allowed.
- Optional leading icon only when it helps recognition, not decoration.

Avoid product-local fields that invent a new shape for the same interaction. The Money transaction category field in the screenshot is understandable, but it drifts from Goals by using a different trailing button shape, heavier type, and no shared picker state contract.

## Open Surface

The open surface should depend on list size and task:

| Situation | Canonical Surface | Source Bias |
| --- | --- | --- |
| Small fixed set | Compact drawer rows | Goals `EnumPickerField` |
| Medium searchable list | Choice-picker drawer | Goals mechanics plus Money category picker anatomy |
| Large relational list | Full-screen searchable picker | Goals `RelationPickerField` |
| Finance classification | Choice-picker drawer with domain slots | Money content, shared anatomy |

Apple's [picker guidance](https://developer.apple.com/design/human-interface-guidelines/pickers) describes pickers as controls for choosing distinct values, and Apple's [pull-down button guidance](https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons) frames menus as compact controls for related options. Kwilt should use that same distinction: a category field is a picker, not a bespoke card or transaction summary. Material's [bottom-sheet guidance](https://m3.material.io/components/bottom-sheets/guidelines) is also useful for the medium-list case where keeping context matters.

## Category Picker Recommendation

For Kwilt Money transaction categories:

```tsx
<DrawerChoicePicker
  trigger={<PickerFieldTrigger label="Category" value="Income" />}
  title="Choose category"
  searchPlaceholder="Search categories"
  options={categories}
  selectedValue={categoryId}
  renderOption={renderMoneyCategoryOption}
/>
```

That means:

1. The closed field should move toward the Goals picker trigger.
2. The open drawer can keep Money's useful classification ergonomics: search, dense rows, selected check, and category-specific iconography.
3. Codex-generated variants should be judged against this contract before they land in either app.

## Extraction Order

1. Promote the Goals picker trigger into the shared package.
2. Promote Goals fixed-set picker rows as the default small-list surface.
3. Add `DrawerChoicePicker` for medium searchable lists, informed by Money's category picker.
4. Keep Money category option rendering local through slots.
