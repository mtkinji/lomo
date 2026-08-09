# UI Contract: Commit Next Meals

## Entry and depth

- The durable top-right **Plan** affordance opens one full-height drawer.
- There is no peek variant and no additional planning screen during settlement.
- The drawer has three local phases: cart, choose, place.

## Scan order

1. Plan title and truthful cart count
2. meal identity, contributor, and named support
3. the current phase instruction
4. one dominant continuation action

## Actions

- Cart: **Choose next meals**
- Choose: checkbox rows, **Continue**
- Place: meal timing rows, **Use these meals**
- Timing editor: **Flexible**, **One day**, **Several days**; then the smallest
  fields required by the chosen timing kind

All dominant actions use Kwilt's neutral charcoal authority. Green is not used
for selection, confirmation, or settlement.

## Accessibility

- Selection rows expose checkbox state.
- Timing rows expose the current human-readable timing value.
- Meal periods and coverage dates expose selected state and 44-point targets.
- Dynamic Type may wrap labels; food titles may truncate only after two lines.
- Flexible is announced as a valid selected timing, never as missing data.

## Next meals

Only populated sections render: dated occasions in chronological order,
coverage commitments, then Flexible meals. No blank days, empty meal periods,
completion percentage, or calendar grid appear.
