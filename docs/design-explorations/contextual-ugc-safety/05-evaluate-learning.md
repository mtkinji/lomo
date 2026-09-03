# Evaluate Learning: Contextual UGC Safety

## Questions and evidence

- Can a user find Report from every reachable remotely authored item? Verify with a surface inventory and device walkthrough.
- Does a submitted report persist the correct server-side snapshot without exposing reporter identity? Verify with two user sessions and an operator query.
- Does peer blocking immediately suppress existing social contact, while an active
  same-Household relationship rejects the block and remains governed through Family
  settings? Verify with peer and Household account matrices.
- Can a managed child understand that the report is private, that the reported
  person was not notified, and that Kwilt has not falsely removed a caregiver?
- Can the operator acknowledge urgent reports within 4 hours and all other reports within 24 hours? Run a production intake drill and retain timestamps.
- Does filtering stop clearly disallowed shared text without blocking ordinary difficult-life language? Test allow and deny corpora; review false positives before expanding rules.

## Decision rule

ASR-005 can move to verified only after the exact deployed schema/function versions, operator alert path, authorization suite, content-filter corpus, and two-account candidate behavior are captured. Source and Simulator evidence alone are insufficient.
