# UI Contract: Child-readable Chore Agreement

## Job

When a child opens Chores, they need to see what is theirs, what they may choose, and the smallest truthful statement of what remains, so they can act without a caregiver translating the family's rules.

## Authority chain

1. Andrew's accepted Chores decisions and Charlie's observed comprehension evidence.
2. The Chores feature brief and child-readable learning release.
3. iOS, Android, and accessibility requirements.
4. Kwilt UI Constitution, semantic tokens, shared `ActivityListItem`, `Button`, `BottomDrawer`, and Canonical Bottom Dock Geometry.
5. React Native Reusables as generic anatomy reference; no new upstream dependency is introduced.

## Three-second read

This is Charlie's chore list. The upper section is his current work; the lower section contains work he may choose. The bottom sentence quietly states what remains and by when.

## Primary action

Act on a chore: review what done means and explicitly **Mark done** or **Submit for approval** in the chore drawer, or **Take** one from **Choose a chore**.

No screen-wide primary button is added. Row actions remain local and equally quiet because the child chooses the relevant chore.

For incomplete work, the shared completion control expresses intent and opens the taller detail drawer; it does not mutate occurrence state. The drawer presents photo capture before one explicit footer action. Photo and approval are independent root-chore policies: required evidence disables the footer action until an image is attached; **Not required** approval completes after **Mark done**; **Caregiver approval** enters **Waiting for approval** after **Submit for approval**. Caregiver approval is the only transition that produces the checked completed state for approval-required work. A genuinely completed check remains a direct toggle: unchecking restores assigned work to ready or shared work to its existing claim, removes completion credit, and clears prior review metadata.

## Primary information

- chore title and completion state;
- whether the chore is already mine or available to choose;
- the next requirement and its explicit time boundary; and
- token value and current balance only when tokens are enabled.

## Secondary information

- waiting-for-approval state;
- connected Screen Time purpose; and
- whether a claimed chore can be removed from their list.

For completed work, the detail drawer changes from instructions to a receipt. Its title stands alone in the canonical compact header. The body identifies the performer with the shared avatar pill, records when the chore was completed, records when and by whom it was approved when caregiver review applied, and changes the optional token label from **Earns** to **Earned**. Eligibility copy, **What done looks like**, and the generic `This chore is complete` sentence disappear because the completed state and receipt already establish that truth.

## Reveal later

**How my chores work** expands the active daily, weekly, benefit, and token clauses. The taller chore detail drawer reveals the definition of done, optional photo evidence, and the explicit completion action. Review details, caregiver configuration, recurrence, and policy mechanics remain in their existing progressive-disclosure surfaces.

## Scan order

1. **My chores** and its rows.
2. **Choose a chore** and its rows.
3. The anchored agreement bar and optional token balance.

## Must not add

- top progress labels or a progress bar;
- percentage, dashboard, score, streak, ranking, urgency color, or celebration;
- persistent helper copy beneath either section heading;
- token vocabulary when tokens are disabled;
- a claim that Screen Time was unlocked or delivered;
- a generic expectation editor; or
- a second completion or token counter.

## Reuse map

- Chore row -> shared `ActivityListItem` flat surface.
- Completion intent -> shared squared Activity completion control opening the capability-owned detail/review drawer.
- Completion review -> Canonical `BottomDrawer` at the detail/review height, `BottomDrawerHeader`, scroll body, and one `BottomDrawerFooter` action.
- Completed receipt -> canonical compact `BottomDrawerHeader` with no subtitle, the Chores review drawer's avatar/name pill, and quiet labeled completion/approval timestamps.
- Optional evidence -> a full-width secondary **Take a photo** `Button`, with quieter **Choose from library** access and a full-width 4:3 landscape attachment that opens a full-screen pinch-to-zoom viewer. The viewer preserves the source image with `contain` and uses one transparent 44-point close control with a high-contrast white glyph.
- Take -> 24-point shared inline `Button` at the trailing edge of the row's second metadata line, with 12-point type and a 44-point touch target.
- Claimed-chore options -> 24-point ghost ellipsis trigger at the row's upper-right, centered on the title's first line, with a 44-point touch target; its shared `DropdownMenu` contains the neutral **Return to family list** action. The metadata line remains exclusively about the reward.
- Member identity -> existing `MemberControl` and `ProfileAvatar`.
- Agreement explanation -> existing `BottomDrawer` and `BottomDrawerHeader`.
- Fixed lower placement -> Canonical Bottom Dock Geometry's safe-area and content-clearance rules, translated into a capability-owned informational bar rather than the floating `ActionDock` material.
- Token meaning -> the Kwilt-owned `Icon` boundary maps `circleDollarSign` to a small monochrome outline, paired with explicit `N token(s)` text in secondary styling.

## Nearest precedent

The inventory/list Candidate pattern provides the flat section and row hierarchy, and the shared `InventoryControlGroup` / `InventoryControlSurface` supplies the same compact filter-rail treatment used by To-dos while the Chores trigger retains its smaller scope picker. Unsupported Sort and Group actions remain absent. The existing Chores caregiver review drawer provides the nearest evidence-and-decision anatomy; the child drawer differs by offering capture before submission. Canonical Bottom Dock Geometry provides safe-area ownership and scroll clearance, but its existing floating action components are intentionally not reused because the completion action belongs to the drawer.

## External exemplar ledger

N/A. No external product is selected for this task.

## Behavior sources

- `Take` / `Return to family list` -> explicit user decision and Chores claim lifecycle. Returning a claim is secondary and appears through progressive disclosure.
- Daily and weekly clauses -> active learning expectation facts.
- `Choose N more` versus `N chores left` -> expectation qualifying scope.
- Pending approval -> existing review policy and accepted research refinement.
- Completed performer and timing -> occurrence `performedByMemberId` and `performedAtIso`.
- Caregiver approval timing -> occurrence `reviewedByMemberId` and `reviewedAtIso`; absent for trusted completion.
- Token balance -> completed, approved local ledger projection while tokens are enabled.
- Screen Time line -> optional benefit description only; no enforcement claim.

## Unresolved decisions

- The circle-dollar-sign treatment is a learning candidate intended to communicate value without the visual force of a gold collectible coin. If it reads too literally as cash or repetition remains too strong in runtime review, reserve the icon for the balance and keep row values text-only.
- Production caregiver authoring of expectations remains deferred.
- A token-enabled household with no expectation receives only a small balance treatment; its permanent placement remains a later learning decision.

## Required states

- mixed daily plus additional weekly choice quota;
- assigned-only expectation;
- open-pool-only quota;
- all-qualifying-work quota;
- partial and completed states;
- trusted completion with performer and completion time;
- caregiver-reviewed completion with performer, completion time, approver, and approval time;
- portrait and landscape evidence inside the stable 4:3 preview frame and full-screen viewer;
- waiting for approval;
- tokens enabled and disabled;
- no active expectation;
- caregiver projection without the child agreement bar;
- long chore titles and scroll content above the bottom safe area.

## Proof path

Use the real Settings > Kwilt Labs > Chores route in the iPhone 17 Pro iOS 26.5 Simulator. Operate member switching, Take, the claimed-chore ellipsis, Return to family list, trusted completion, pending approval, agreement disclosure, tokens off/on, and caregiver projection. Capture the child default, claimed-row, claimed-chore menu, agreement drawer, tokens-enabled, and completed or pending states. Physical-device, Android, Dynamic Type, and assistive-technology proof remain separate gates.

## Caregiver root-chore management

The caregiver projection represents the stable chore series. Its three-second read is the household's recurring chore inventory: who owns each chore and how often it repeats. Tapping a row opens the existing full-height chore form in edit mode, not the occurrence detail or completion receipt. The editable root fields are title, assignee or Household, recurrence, definition of done, **Photo** (`Optional` or `Required`), **Approval** (`Not required` or `Caregiver approval`), and token reward when enabled. **Save chore** updates future recurrence generation while preserving prior occurrence identity, performer, evidence, completion, and approval facts.

Individual occurrence receipts remain child- and review-owned. Series-scoped performance history is a later progressive disclosure, not a competing tab, dashboard, score, or default caregiver-row destination.
