# Home Four Feed Patterns Implementation Plan

> Execute inline in the continuing checkout; preserve unrelated dirty work. User accepted the four-pattern recommendation. No new backend behavior or canonical promotion.

**Goal:** make Moment, Contribution, Personal message, and Invitation/request distinct compositions of shared feed anatomy.

**Architecture:** feature-local FeedItemParts owns header, context, response row and layout. Existing post/chore exports remain compatible adapters; DeliveryCard routes to separate message/request compositions using a tested event-kind map. Source state controls availability, never invented outcomes or urgency. One catalog still drives native and browser review.

**Tech stack:** Expo/React Native, existing Kwilt UI primitives/tokens, Jest, native Simulator, static review manager.

## UI contract and authority

Job: Maya catches up with her people, understands what happened and chooses whether to respond or participate.
Authority: current user decision and Connected Moments PRD → native accessibility → Kwilt constitution/tokens/components → RNR anatomy reference. No new dependency or upstream component localization.
Three-second read: person → moment/message/contribution/request → natural response.
Primary information: words/media/factual contribution or participation purpose. Secondary: audience/recipient, source, time. Reveal later: overflow, long words, grouped detail, full conversation/media.
Scan order: shared identity → content → source context → response/action → conversation preview.
Actions: quiet local social responses; requests get one neutral outline participation action; messages get a quiet source link. No per-item primary buttons competing through the feed.
Containment: open items with common gutters and rhythm; context grouped with a quiet rule; no delivery-only outer card. Compact contribution uses the same identity and actions at lower internal spacing.
Reuse map: identity → ProfileAvatar; options → DropdownMenu and 44pt icon Button; actions → Button; layout → VStack/HStack/View; media → existing gallery; typography → theme.
Nearest precedent: Connected Moments feed (candidate), now formalized across four compositions. Existing canonical Button/DropdownMenu contracts remain authoritative.
External exemplar: user Instagram screenshots supplied September 9 (app version unknown). Preserve stable identity/content/action anatomy; translate to Kwilt spacing and purpose; reject popularity emphasis, proprietary assets and Instagram-specific navigation.
Behavior sources: existing post audiences, source routing, automatic chores, save/report/edit/delete callbacks and permissions remain owned by existing production logic. Personal message is a presentation pattern, not new DMs.
Required states: all 46 catalog fixtures, source availability, selected responses/saving, photo failure/loading, long text/names, menu actions, grouped expansion.
Proof: native Dev tools → feed lab, all captures and representative four-pattern mixed feed; browser review manager and focused tests. No physical-device/release claim.

## Tasks

- [x] Ground: inspect current renderers, contract, canonical primitives and source settlement reasons.
- [x] Define: record four patterns and shared anatomy as candidates, not canonical.
- [x] Implement: regression-first mapping/outcome/response copy; shared header/menu/context/actions; four compositions retaining production callbacks.
- [x] Improve composition: content and context before responses, consistent gutters/time/avatars, no repeating primary buttons; preserve meaningful modes.
- [x] Render: update fixture family labels/revisions, browser pattern filter, recapture 46 variants, inspect normal and edge interactions plus mixed composition.
- [x] Critic: verify hierarchy, system fit, interaction and native evidence; run focused and completion checks, record remaining platform boundaries.
