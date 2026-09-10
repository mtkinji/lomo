# Chat compatibility and recovery implementation plan

**Goal:** Prevent supported chat proposals from rejecting conversations and preserve accurate review and completion information.

**Architecture:** Keep protocol v2 and strict capability/operation validation. Add a full operation fixture to both repositories and a drift check against the native protocol. Use a tested recovery predicate for errors after initialization. Preserve receipts for supported newer domains.

**Tech stack:** TypeScript, React, React Native, node:test, Jest.

- [ ] Add failing regressions covering all operation pairs, non-To-do review labels, errors after initialization, and receipt loading.
- [ ] Align hosted proposal types and validator with the native protocol.
- [ ] Render explicit recovery on invalid snapshots and clear initialization timeout after success.
- [ ] Use domain review labels and preserve proposal consequence text.
- [ ] Preserve Household, Meals, Chores, and Groceries receipts in native loading.
- [ ] Run focused tests, cross-repository conformance, and diff-aware completion verification. Record release boundaries separately.

Work in the current ordinary checkouts. Preserve unrelated dirty changes. No production deployment is included in this implementation pass.
