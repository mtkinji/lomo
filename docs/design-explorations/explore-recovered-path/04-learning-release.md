# Learning Release: explore-recovered-path

## Concept To Build
Show one failed outing as an explicitly recovered, gapped path made only from owner location samples.

## Capability Delta
Today, the user cannot see the failed outing.

After this release, the user can recognize supported portions on the existing map and understand that they were recovered.

Still intentionally not supported: inferred route geometry or general automatic-route promotion.

## User Experience
The path appears with the existing solid route treatment, but unsupported intervals remain physically disconnected. Review explains its provenance and missing intervals.

## Creative Direction
See [`03a-creative-direction.md`](03a-creative-direction.md). Runtime visual review remains open.

## Existing Product Relationship
Enhances path history and recap; leaves recording, fog, Places, sharing, and navigation unchanged.

## Buildable Slice
Must be real: evidence type, bounded recovered continuity, distinct path rendering, persistence, disclosure, and one owner-scoped repaired record.

Can be thin: recovery is performed once in the backend rather than exposed as UI.

Intentionally excluded: settings, batch recovery, road matching, and notifications.

## Release Channel
Local code plus owner-only synced data. A released bundle is required before the new presentation can be claimed on-device.

## Brand-Goodwill Guardrails
- Never hide gaps.
- Never call recovered samples a normal recording.
- Never modify unrelated automatic history.

## Reversibility
Removing the optional evidence marker restores the prior strict rendering; the untouched source ambient session remains the recovery source.

## Permanent Product Threshold
Promote only if the recovered route is understandable and trustworthy in native review.
