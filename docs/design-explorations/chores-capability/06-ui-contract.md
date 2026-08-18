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

Act on a chore: complete one already in **My chores**, or **Take** one from **Choose a chore**.

No screen-wide primary button is added. Row actions remain local and equally quiet because the child chooses the relevant chore.

## Primary information

- chore title and completion state;
- whether the chore is already mine or available to choose;
- the next requirement and its explicit time boundary; and
- token value and current balance only when tokens are enabled.

## Secondary information

- waiting-for-approval state;
- connected Screen Time purpose; and
- whether a claimed chore can be removed from their list.

## Reveal later

**How my chores work** expands the active daily, weekly, benefit, and token clauses. Chore definition of done, optional evidence, review details, caregiver configuration, recurrence, and policy mechanics remain in their existing progressive-disclosure surfaces.

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
- Completion -> shared squared Activity completion control.
- Take -> 24-point shared inline `Button` at the trailing edge of the row's second metadata line, with 12-point type and a 44-point touch target.
- Claimed-chore options -> 24-point ghost ellipsis trigger at the row's upper-right, centered on the title's first line, with a 44-point touch target; its shared `DropdownMenu` contains the neutral **Return to family list** action. The metadata line remains exclusively about the reward.
- Member identity -> existing `MemberControl` and `ProfileAvatar`.
- Agreement explanation -> existing `BottomDrawer` and `BottomDrawerHeader`.
- Fixed lower placement -> Canonical Bottom Dock Geometry's safe-area and content-clearance rules, translated into a capability-owned informational bar rather than the floating `ActionDock` material.
- Token meaning -> Kwilt-owned semantic `token` icon with a metallic gold gradient, soft gold rim, specular highlight, and embossed Kwilt mark in the existing icon boundary.

## Nearest precedent

The inventory/list Candidate pattern provides the flat section and row hierarchy. Canonical Bottom Dock Geometry provides safe-area ownership and scroll clearance, but its existing floating action components are intentionally not reused because this surface communicates state and optional disclosure rather than one persistent primary action.

## External exemplar ledger

N/A. No external product is selected for this task.

## Behavior sources

- `Take` / `Return to family list` -> explicit user decision and Chores claim lifecycle. Returning a claim is secondary and appears through progressive disclosure.
- Daily and weekly clauses -> active learning expectation facts.
- `Choose N more` versus `N chores left` -> expectation qualifying scope.
- Pending approval -> existing review policy and accepted research refinement.
- Token balance -> completed, approved local ledger projection while tokens are enabled.
- Screen Time line -> optional benefit description only; no enforcement claim.

## Unresolved decisions

- Token artwork uses an intrinsic gold treatment so muted row metadata cannot make the reward read like a generic status glyph; semantic identity and accessibility meaning remain fixed.
- Production caregiver authoring of expectations remains deferred.
- A token-enabled household with no expectation receives only a small balance treatment; its permanent placement remains a later learning decision.

## Required states

- mixed daily plus additional weekly choice quota;
- assigned-only expectation;
- open-pool-only quota;
- all-qualifying-work quota;
- partial and completed states;
- waiting for approval;
- tokens enabled and disabled;
- no active expectation;
- caregiver projection without the child agreement bar;
- long chore titles and scroll content above the bottom safe area.

## Proof path

Use the real Settings > Kwilt Labs > Chores route in the iPhone 17 Pro iOS 26.5 Simulator. Operate member switching, Take, the claimed-chore ellipsis, Return to family list, trusted completion, pending approval, agreement disclosure, tokens off/on, and caregiver projection. Capture the child default, claimed-row, claimed-chore menu, agreement drawer, tokens-enabled, and completed or pending states. Physical-device, Android, Dynamic Type, and assistive-technology proof remain separate gates.
