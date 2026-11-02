# Budget read lifecycle implementation plan

> Execute inline using the executing-plans workflow. The checkout is shared with unrelated work; no worktree, delegated implementation, commit, or deployment is part of this slice.

**Goal:** Prevent pre-edit initialization and refresh results from replacing confirmed edits, and share overlapping snapshot reads while their mutation generation is unchanged.

**Architecture:** A provider-scoped loader shares only an in-flight request for a specific mutation generation. Completed requests are never cached by this loader. Initialization, manual refresh, and mutation background refresh use the loader; accepting results additionally requires the originating session and mutation generation to remain current.

**Tech stack:** TypeScript, React Native context, Jest, React Native Testing Library.

## Files and behavior

- Create `src/capabilities/money/data/moneySnapshotRequests.ts` and `.test.ts`: in-flight read ownership, generation isolation, retry after rejection, safe cleanup of superseded reads.
- Update `src/capabilities/money/data/MoneyDataContext.tsx` and `.test.tsx`: shared reads and behavioral regressions for initialization, manual refresh, confirmed edits, and provider cleanup.
- Update `src/capabilities/money/screens/MoneyLivingPlanReceiptScreen.tsx`: mark refresh after reversal as invalidating; the provider disconnect path must do the same.
- Update `docs/engineering/budget-quality-assessment-2026-11-01.md`: record local evidence without claiming installed-device or production results.

## Steps

- [x] Add provider regressions: cached data permits an edit while initial loading is pending; resolving or rejecting that older load must preserve the edit and its state. Two simultaneous refreshes must perform one load. A refresh overlapping a post-edit background read must share it. A new confirmed edit must start a new read.
- [x] Run `npm test -- --runInBand src/capabilities/money/data/MoneyDataContext.test.tsx` and retain the expected failures.
- [x] Add loader tests: same-generation promise sharing, new-generation isolation, settled-read eviction, failure retry, and an old completion unable to clear a newer pending read. Run red before implementing the loader.
- [x] Implement the loader and provider integration. Keep governed initialization's foundation/reconciliation behavior; wrap only its snapshot read method. Guard cached and authoritative initial results, errors, and late classification callbacks. Cleanup invalidates pending read acceptance.
- [x] Run the two focused test files and the existing governed lifecycle tests. Address behavioral failures without widening scope.
- [x] Review the read ordering with the code-review skill. Correct the identified disconnect/reversal regression with explicit post-write invalidation and deferred regressions.
- [x] Run scoped `npm run verify:local -- --run --files` once against the changed source, tests, plan, and assessment. Record omitted files and any shared-check failures.
- [x] Document evidence and remaining gates. Atomic settings, durable write recovery, bounded history, production release, and installed-device timing remain separate work.

## Acceptance boundary

These tests establish local ordering and request-count behavior under deferred responses, not lower device latency or successful production writes. Reads before a confirmed edit cannot be reused after it. An obsolete background reconciliation must not initiate another full load. No cancellation of already-running backend work or new authorization behavior is introduced.

Local outcome: 33 focused tests passed; final scoped verification passed with 117 related tests and static checks. Two code-review findings were reproduced and corrected (external writes and reconciliation completion must invalidate older reads). No remaining review findings within this slice. Source remains local and uncommitted; device and release gates remain open.
