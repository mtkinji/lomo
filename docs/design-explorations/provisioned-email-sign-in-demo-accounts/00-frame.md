# Frame: Provisioned Email Sign-In And Demo Accounts

## What the user said

> I keep wondering if we need to implement email sign in, in part so that we can specifically support one or more demo accounts.

## Restated in user voice

When I need to return to a trusted Kwilt identity or evaluate its account-backed experience, I want a dependable sign-in path that does not depend on access to someone else's Apple or Google account, so that the same private, representative experience is available without weakening account boundaries.

## Target audience

Primary: `audience-ai-native-life-operators` — people who expect one trustworthy identity to carry across Kwilt surfaces.

Secondary operating audience: App Review, invited evaluators, and Kwilt operators. This is a distribution and verification audience, not a new product persona or JTBD node.

## Representative persona

Nina is the closest durable product persona. She expects identity, permissions, and accumulated context to remain inspectable and reliable across surfaces.

- Current situation: she needs account-backed Kwilt capabilities without depending on one social provider session.
- What she is trying to do: reach the same bounded private system reliably.
- Emotional state or tension: willing to trust the system only when access and authority are predictable.
- What would make this feel wrong: a back door, unexplained demo powers, duplicate identities, or synthetic behavior presented as real.

Maya shapes the synthetic demo household story: representative family life without real household data.

## Hero anchor

`jtbd-trust-this-app-with-my-life` — dependable identity is prerequisite infrastructure for every private, synced, shared, and AI-operated capability.

## Job flow step

`job-flow-nina-trust-ai-with-my-life-system`, step 1: arrive with visible scope and an exact destination. The current score is 4, but Apple and Google OAuth do not provide transferable credentials for App Review or controlled evaluation.

The paired-account demo also helps verify the unresolved two-account runtime gap in `job-flow-david-invite-the-right-people-in` without changing that flow's privacy contract.

## Active anchors

- `jtbd-trust-this-app-with-my-life` — access must be dependable without broadening authority.
- `jtbd-invite-the-right-people-in` — paired synthetic identities make private sharing and Household participation reviewable.

## Friction we're addressing

Apple and Google are appropriate primary sign-in methods for ordinary users but are unsuitable as shared review credentials. Kwilt has account-based features that App Review and invited evaluators cannot reliably inspect through a transferable Apple or Google identity. Existing development fixtures do not provide an ordinary production account lifecycle.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: the first-time sign-in interstitial, intent-gated auth drawer, and signed-out Settings entry offer Apple and Google.
- Existing user flow: local use remains available; sign-in is requested when sync, sharing, Chat, calendars, or administration requires identity.
- Existing domain/data model: Supabase Auth user IDs and RLS remain the authority; Household membership does not expose private Goals, chats, Money, or Activities.
- Existing technical affordances: Supabase email auth is represented in local configuration, auth state is already provider-agnostic after a session exists, and account deletion already applies to authenticated users.
- Existing UX/copy conventions: provider choices are calm, optional, and tied to the reason identity is needed.

Constraints to preserve:

- Apple and Google remain primary.
- Capture-first and signed-out local use remain available.
- Email sign-in does not imply open email registration.
- A demo marker never grants authorization, bypasses RLS, or unlocks admin access.
- Demo data is fictional and visibly representative; provider-bound actions remain truthful.
- Account deletion remains reachable. Deleted demo identities must be recoverable operationally, not protected through a user-facing exception.

Constraints we may challenge:

- The current assumption that every production account begins through social OAuth.

Design implication:

Add one secondary sign-in method that yields the same ordinary Supabase session as existing providers. Keep provisioning and reset server-owned, and treat the synthetic household as data lifecycle infrastructure rather than client-side demo branching.

## Aspirational design challenge

How might we help Nina and trusted evaluators reach a representative Kwilt identity reliably, while preserving optional sign-in, ordinary authorization, and truthful product behavior?

## Out of scope

- Public email registration.
- Account-provider linking or migration.
- Passwordless email or magic-link authentication.
- Special demo permissions, super-admin access, or fake success for provider-bound capabilities.
- A public in-app demo mode.

## Open question

Which exact production demo cohort should be created first: one App Review owner account, or an owner/member pair from the beginning?
