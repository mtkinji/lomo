# Converge: money-category-ordering

## Comparison

| Direction | Maya fit | System fit | Accessibility | Accidental-action risk | New concepts |
| --- | --- | --- | --- | --- | --- |
| Drag the meter grid | Medium | Low | Medium | High | None |
| Dedicated reorder list | High | High | High | Low | None |
| Pin a few categories | Medium | Medium | High | Low | Pinning |

## Chosen direction

Dedicated reorder list.

Today Maya cannot make Summary or the category picker reflect her own priority order. After this release she can open `Reorder categories`, drag a full-width row, choose Done, and see that sequence everywhere categories are listed. She still cannot create groups, set a different order per month, or ask Kwilt to rank categories automatically.

## Reductive design decisions

- Enhance Summary's existing overflow menu; add no top-level screen or Settings section.
- Use one title, `Reorder categories`; add no eyebrow or instructional paragraph.
- Keep every category in one list; add no groups, favorites, or ranking labels.
- Save once on Done. Closing without a changed order performs no write.
- Treat order as household truth and use it in Summary and transaction category pickers.

## Activation

This is an occasional customization. Organic discovery in Summary options is sufficient. Do not interrupt first use or add a promotional tip.

## Bet

We're betting that an explicit reorder drawer is discoverable enough for an occasional preference and materially safer than direct grid dragging. If dogfooding shows the menu is too hidden, the next move is a temporary `Reorder` command in the empty area beneath the month header—not ambient drag gestures.

## Success signal

Andrew can reorder Housing ahead of other categories, relaunch, and see the same sequence in Summary and transaction category selection without any plan amount or transaction meaning changing.
