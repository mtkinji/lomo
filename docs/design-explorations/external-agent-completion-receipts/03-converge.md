# Converge — agentic completion with calm Home proof

## Chosen composition

Use a compact `Recently done` region in Home’s existing header sequence, after recommendations and before social catch-up/requests. It contains one neutral surface with up to three flat receipt rows.

Scan order:

1. Result summary — what changed.
2. Source and time — where it came from and when.
3. Feed content — Home continues normally.

There is no primary action. The region is evidence, not work.

## Data contract

- Source: the existing owner-scoped external write audit returned by `external-connections`.
- Include: successful terminal writes with real domain results.
- Exclude: reads, failures, proposals, client/native handoffs, and incomplete work.
- Dedupe: collapse idempotent replays and repeated rows for the same tool/object.
- Bound: at most three receipts from the last 14 days.
- Full history: remains connection-local in Settings → Apps & connections.

## Visual direction

- Warm neutral card, no elevation and no decorative accent color.
- Small check-circle icon communicates completion without celebratory green.
- Body-sized result copy; secondary source/time line.
- No badges, unread dots, counters, swipe actions, or dismiss affordances.

## Reference ledger

| Source | Preserve | Translate | Reject |
| --- | --- | --- | --- |
| Kwilt Home four-pattern trial | Quiet surface, 32pt section rhythm, content-first hierarchy | System-authored receipt rows inside one bounded Home-local region | Pretending a system receipt is a social feed item |
| Kwilt Apps & connections | Owner-scoped source and recent-action truth | Short source/time metadata on Home; full history stays in Settings | Duplicating management controls on Home |
| ChatGPT app action approvals ([official guidance](https://help.openai.com/en/articles/20001495-managing-app-permissions-in-chatgpt)) | Confirmation stays in the initiating agentic surface and is proportional to risk | Kwilt returns and later displays the resulting receipt | A second approval prompt inside Kwilt |

## Learning release

Ship the projection over existing completed external-write audit rows first. Measure usefulness and clutter before adding object navigation or undo. Server-owned confirmation/apply coverage is a separate capability migration and must not be represented as complete until every exposed reviewed operation has an executable continuation.

Editable mockup: [`mockups/recently-done.svg`](mockups/recently-done.svg)
Rendered mockup: [`mockups/recently-done.svg.png`](mockups/recently-done.svg.png)
