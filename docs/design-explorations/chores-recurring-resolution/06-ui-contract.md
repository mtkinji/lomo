# UI Contract: Recurring Chores And Child Agreement

Job: When a repeating chore crosses its next window, the family needs one truthful current responsibility plus a bounded way to correct work that happened but was not recorded.

Authority chain: Andrew's explicit inclusion decision -> accepted Chores brief -> Kwilt UI Constitution and Canonical picker/drawer components -> existing Activity recurrence model.

Three-second read: caregiver editor: how often it repeats, then what happens if it is missed. Child detail: today's action first, with a quiet earlier-day correction only when eligible. Caregiver review: whether this dated earlier completion counts.

Primary action: caregiver saves one chore definition; child acts on one current occurrence. In correction mode, the child asks a caregiver to count selected dates and the caregiver resolves one dated occurrence.

Primary information: recurrence cadence, miss outcome, current agreement status.

Secondary information: pending approval and connected Screen Time purpose.

Reveal later: token balance and full agreement clauses in **How my chores work**; eligible missed dates inside the contextual correction drawer, never the current list.

Scan order: child list -> current agreement sentence -> agreement detail on request.

Must not add: multiple owed copies, overdue color, debt count, penalty language, a history dashboard, automatic retroactive credit, a second footer metric, or a claim that Screen Time was delivered.

Reuse map: recurrence -> existing Activity repeat sheets; miss outcome -> Canonical `SmallSetPickerField`; footer -> existing capability-owned `ChoreAgreementBar`; child correction and caregiver review -> existing `BottomDrawer`, `BottomDrawerHeader`, `BottomDrawerFooter`, `Button`, and Chores review queue.

Nearest precedent: the accepted child-readable Chore Agreement. The fixed bar remains divider-separated and informational, but carries one outcome rather than progress plus balance.

External exemplar ledger: Todoist recurring task behavior was checked for one-current-occurrence and skipped-copy precedent; preserve the finite list, translate into household language, reject productivity/overdue treatment.

Behavior sources: **Start fresh next time** -> `scheduled`; **Keep open until done** -> `after_completion`; missed receipt -> time reconciliation; earlier-day correction -> Andrew's accepted contextual child-request pattern; footer benefit copy -> Chores agreement input fact.

Unresolved decisions: none for the local learning slice.

Required states: one time; scheduled repeat; keep-open repeat; stale scheduled occurrence; future scheduled occurrence; one eligible yesterday; several eligible dates; correction requested; correction counted; correction left missed; ordinary pending approval; agreement incomplete; agreement satisfied; tokens on/off.

Proof path: Settings -> Kwilt Labs -> Chores on iPhone 17 Pro/iOS 26.5 Simulator; edit both recurrence outcomes, cross deterministic date boundaries in tests, submit single- and multi-date corrections, resolve both caregiver outcomes, and inspect child/footer truth. Physical-device, Android, Dynamic Type, and assistive-technology proof remain separate.
