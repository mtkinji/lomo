---
id: brief-explore-nearby-places
title: Explore nearby Places
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-explore-capability, brief-explore-missions-stories-system]
owner: andrew
last_updated: 2026-08-01
---

# Explore Nearby Places

## Context

Explore can preserve visited Places but cannot help someone in an unfamiliar area notice a few worthwhile possibilities nearby. Generic recommendations must remain distinct from Mission commitments and from route-proven history.

## Design

Extend the existing bottom Places control into one drawer with **Nearby** and **My Places**. Nearby queries the current map center only after an explicit user action and presents a small ranked set as synchronized map pins and list rows.

### Nearby contract

- Native iOS MapKit search uses a category-bounded POI request.
- Radius options are quarter mile, half mile, and one mile; half mile is the default.
- Results are deterministically deduped and ranked by distance with a mild affinity for Place kinds already present in local history.
- Recommendations are in-memory and private to the current foreground use.
- Recommendation pins use a distinct possibility treatment and appear only while Nearby is open.
- Search never clears fog, records a visit, creates a Place relationship, or creates a Mission.
- Moving the map requires **Search this area** before results change.

### My Places contract

- My Places preserves search across canonical Places with user relationships.
- Selecting either a nearby or personal Place centers the map and keeps the drawer available for continued browsing.
- Collected Place marker visibility remains controlled by the existing Places layer preference.

## Success signal

From a simulated Tokyo location, the user can open Places, receive a small set within half a mile, switch between Nearby and My Places, select from either pins or rows, and accurately explain which places are suggestions versus visited history.

## Spec refinement

- The first slice uses straight-line distance; do not label it as walking time.
- Android and unavailable native builds render a calm provider-unavailable state.
- Nearby state is not persisted and does not enter the Mission inventory.
- Logic, ranking, native contracts, and hook branching require tests; the drawer layout may be implemented directly with component coverage.
- Signed-device search quality and MapKit network behavior remain required before release claims.
