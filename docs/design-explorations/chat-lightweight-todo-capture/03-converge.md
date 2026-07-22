# Converge: Chat Lightweight To-do Capture

## Qualitative comparison

| Direction | Nina / trust | Capture speed | System reuse | Clutter risk |
| --- | --- | --- | --- | --- |
| Confirm Before Create | Medium | Low | High | Medium |
| Capture, Enrich, Inspect | High | High | High | Low |
| Create Then Open Detail | Medium | Medium | High | Low |

## Chosen direction

**Capture, Enrich, Inspect.** A direct create instruction is already an authorization for a reversible Activity record. Kwilt should reuse the established Quick Add behavior: create promptly, enrich through the Activity-owned pipeline, and render the result through the standard compact inventory display model.

## Capability delta

Today, Nina cannot ask Chat to create an ordinary To-do without reviewing a second, Chat-specific detail form.

After this change, Nina can say “add call the school Friday,” receive an enriched authoritative To-do, tap it to open native detail, return to the exact Chat thread with Back, or swipe-left to delete it.

Still intentionally unsupported: silent destructive updates, money movement, Screen Time enforcement, sharing, or other capabilities where an instruction cannot safely stand in for a separate permission boundary.

## Reductive decisions

- Remove the pre-create proposal form for explicit To-do creation.
- Do not add a Chat-specific Activity card; reuse `ActivityListItem` semantics and `buildActivityListMeta` presentation data wherever the WebView boundary permits.
- Do not force inspection.
- Do not reproduce reminder, recurrence, location, steps, tags, estimate, priority, or Goal controls in Chat.
- Make the inventory row the only visible result; row tap opens it and swipe-left reveals Delete.
- Ask one short clarification only when a usable title cannot be determined.

## System implications

- Split capability policy by operation risk: explicit reversible `create_activity` may auto-apply; update operations keep the reviewed proposal path.
- Extract or reuse the Activity-owned Quick Add create/enrich pipeline instead of maintaining a second enrichment implementation in Chat.
- Project the authoritative Activity's standard inventory metadata into the workbench receipt.
- Preserve the Chat route/thread/scroll return target when opening Activity detail.

## Activation

No tutorial. The behavior activates organically when the user uses a clear create verb in Chat. The compact authoritative result teaches the capability through use.

## Bet

We're betting that redundant confirmation—not lack of detail—is the dominant blocker for ordinary To-do creation. If users repeatedly open `Inspect` to correct enrichment, we should improve enrichment or selectively surface the one unstable field, not restore a full proposal form.

## Success signal

Andrew can create an enriched To-do in one Chat turn, recognize it as the same object shown in inventories, tap it into native detail, return exactly to Chat, and swipe-delete it without encountering a second editor.
