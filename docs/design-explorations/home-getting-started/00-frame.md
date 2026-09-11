# Home that helps you get going

Status: developed concept; Andrew asked to fit Home into broader onboarding, household readiness and ongoing use. See the current system audit and draft brief; no implementation is authorized by this artifact.

## User offer
Home can help a new user set up Kwilt, show setup progress and useful next steps, and become their feed as they get going.

## User voice and audience
When I have just arrived, help me make Kwilt useful for something I care about, so I can feel a benefit before deciding how much of my life to bring here.

Primary audience: audience-aspirational-family-organizers. Representative persona: Maya, arriving alone before her family has joined. Hero: jtbd-move-the-few-things-that-matter.

serves: [jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]

Maya's documented family-life flow rates next doable action 2/5, family participation 3/5, and continued use 3/5. These are existing document scores, not a new runtime assessment. The proposed activation seam needs its own evidence; do not change scores yet.

## System alignment
Posture: Extend the system. Home gains a personal, resumable activation region. Capability-owned setup and existing authorized feed contracts remain authoritative, including accepted source-owned Chores updates.

Source inspected 2026-09-10:
- SharedLifeFeed.tsx provides feed and empty states; SharedHomeScreen.tsx supplies Home's shell.
- RootNavigator.tsx defaults to MainTabs / ActivitiesTab. FirstTimeUxFlow.tsx can hand off to ArcDetail. Home as an organic first landing is a proposed navigation change.
- Money progressive activation defines first trusted decision separately from connection and delegates setup to Money.
- Household code distinguishes setup sessions, membership, device participation and pending states. Exact readiness predicates need implementation-time verification. Older Screen Time job-flow proof boundaries are not current implementation inventory.

Preserve: gray full-screen Home; ordinary life and connection as the mature feed; private setup state; explicit publication; capability authority; capture without prerequisite setup; relevant direct-link destinations.

Challenge: the empty feed's share-first assumption, and an organic landing that cannot help a new user choose a useful next step.

No posts does not prove no household. An invite pending, quiet household, filtered feed, failure, solo preference and true first use require different treatment.

## Design challenge
How might we help Maya make Kwilt useful for her family one doable step at a time, while letting Home naturally fill with their ordinary life?

Recommended entry decision after the system audit: Home becomes the unscoped shell destination for the future promoted new-user cohort, after the accepted Welcome/reel. Chosen capabilities retain their native result; Skip tour opens the menu without interruption; the next unobscured Home view can offer an inline starting invitation; existing users retain their launch/restore behavior. See `00-system-alignment.md` and the draft brief for the full contract.
