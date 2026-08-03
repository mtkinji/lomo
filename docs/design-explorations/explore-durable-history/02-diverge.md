# Diverge: Explore durable history

## A. Whole-history snapshot
One JSON document is simple to restore but repeatedly transfers old points, creates last-writer-wins conflicts, and scales poorly with years of history. Reject.

## B. Fully normalized GPS schema
Separate sessions, points, cells, Places, and visits provide maximum queryability, but expand the sensitive server surface and couple storage to today's renderer. Defer.

## C. Incremental owner records
Store one owner-only record per completed session, Place, visit relationship, and reset marker. Active samples remain local until the outing completes. Pull only records changed since the last sync and rebuild fog cells locally. Choose.

All alternatives preserve the four-object model because Explore remains a capability-owned record of lived evidence, not a fifth planning object. None blocks capture, adds a dashboard, or enables sharing.
