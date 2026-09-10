# Complete Home Feed Review Inventory Implementation Plan

> Execute inline in the normal checkout. Preserve unrelated dirty work. No worktree, publication, or deployment is needed.

**Goal:** expose every current Home semantic type and multiple representative variants in a manageable design-review inventory.

**Architecture:** one versioned JSON fixture catalog consumed by the native lab and a local browser review manager. Native screenshots remain the rendering authority. Review status, priority and notes are separate local browser data with validated export/import; they never mutate household content or canonical design-system status.

**Tech stack:** existing React Native components, TypeScript/Jest, static HTML/JS, browser localStorage and the existing localhost artifact server.

## Tasks

- [x] Write coverage regressions against current HomeAttachment, HomePost, SharedHomeDelivery event/state unions. Check IDs, group membership, source destinations and representative variant counts.
- [x] Expand the shared fixture catalog: ordinary text/photo formats; place, outing, goal_completed attachments; chore_update; goal_note, goal_checkin, goal_invitation, game_turn and meal_choice_round. Include all existing delivery states and realistic audience/media/social/chore variants.
- [x] Extend native lab with type/variant selection, isolated/mixed modes, and a dev-only direct variant route for reproducible captures. Preserve actual renderer semantics and fixture states.
- [x] Implement review manager filtering/search, compare selection, persistent status/priority/notes, coverage dashboard, selected/all review export and validated import. Review changes do not edit screenshots or production content.
- [x] Capture every catalog variant through the native lab. Inspect each type and edge-state samples. Make missing screenshots explicit instead of substituting another example.
- [x] Verify management persistence, import errors, comparison and coverage; run diff-aware completion checks. Document completeness boundaries and user entry points.

## Acceptance

Every currently supported semantic item type is mapped to a group; every group has at least three variants; every source delivery type exercises pending/available/settled/expired/unavailable. Text and photo are two review formats of one semantic moment type. Authored combinations are representative, not every Cartesian combination. One stable variant ID links fixture, screenshot, notes and export. Imports cannot silently replace unrelated local review data. No real household publication.
