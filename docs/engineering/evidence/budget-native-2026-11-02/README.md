# Native Budget observations, November 2

Checkout `/Users/andrewwatanabe/Kwilt`, branch `codex/budget-native-acceptance`.
Native host: existing development build 127, RN 0.83.10, iPhone 17 Pro/iOS 26.5.
JavaScript: isolated `scripts/money/native-harness`, localhost:8081. No live data.

- `dynamic-type-before.png`: source 404d4523, changing from `large` to
  `accessibility-extra-extra-extra-large` while Transactions remained mounted
  clipped count, date headings and amounts.
- `dynamic-type-after.png`: f8316a19 fix (then uncommitted), same in-session
  transition at fontScale 3.571. Count, date, merchant, category and amount fit.
  Returning to `large` also restored normal layout. Text size was restored.
- `accounts-menu-budget-after.png`: f8316a19 plus the navigation harness extension
  (then uncommitted). Budget → options → Accounts & connections → Manage accounts
  → back returned to Budget. Repeated Accounts entry → Fixture menu → selected
  Budgets returned to Budget, with route log confirming MoneySummary.

The navigation harness uses production screens, menu and selection handlers with
synthetic data and MoneyEntry's automatic fallback when identity is unavailable.
It does not establish real sign-in, onboarding evidence or production root-drawer
integration. The fixture control opens the menu; no native edge-swipe proof is
claimed. Automated drags were ignored or interpreted as taps. Pull-to-refresh and
full-list final-item acceptance were unresolved at this checkpoint.
