# Evaluate Learning: Explore durable history

## Questions
- Does first sync complete for realistic retained histories without visible latency or thermal impact?
- Does a clean-install restore reproduce sessions, Places, and fog territory?
- Do clear-history and Place removal remain deleted on a second device?

## Evidence
Use deterministic repository tests, authenticated database write/read/delete proof, Simulator restore testing, and signed-device battery/thermal observation. Do not collect location analytics.

## Decision rule
Keep the record model if restores are exact and routine sync transfers only changed records. Normalize session points if payload size or conflict behavior becomes material in field use.
