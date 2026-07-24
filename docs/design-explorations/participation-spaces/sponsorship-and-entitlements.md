# Sponsorship and Entitlement Contract

Payment answers **which paid capabilities a person may use and why**. It does not answer which Spaces they belong to, which data they may see, or what authority they have.

## Entitlement sources

Kwilt resolves effective access from an entitlement-source ledger. A person may have more than one active source:

- a personal App Store or direct purchase;
- an Apple-shared purchase receipt;
- sponsorship from a Kwilt Space plan; or
- an explicit internal or promotional grant.

Each source records its scope, provenance, state, and expiry. Effective entitlement is the union of valid sources. Losing one source causes no downgrade when another still covers the capability.

Apple Family Sharing is only evidence that Apple permits a purchase to be shared. It never creates a Kwilt Person, Space participation, household relationship, caregiver grant, or device authority.

## Sponsorship is not membership

A Space sponsor can cover eligible participants without becoming their data administrator. Conversely, a participant may hold powerful caregiver grants while paying for their own plan.

The architecture therefore keeps these facts separate:

- who pays;
- whom or what the payment covers;
- who participates in a Space;
- who can manage participation;
- who may access a capability; and
- who may see or mutate a particular artifact.

A billing manager can see plan state, covered people, renewal state, and payment problems. Billing authority alone reveals no private capability content.

## Bounded participation can be free

Inviting someone to one useful act should not force a family subscription decision. A capability declares a bounded free envelope such as:

- receive an independent recipe copy;
- view or contribute to one explicitly shared collection;
- view and respond to a shared check-in;
- perform a narrowly delegated caregiver action; or
- accept, decline, leave, export, or complete a safety-critical exit.

Full private Kwilt use, broader creation, automation, or ongoing capability access may require a personal purchase or sponsorship. The exact boundary is a product and pricing decision, but it must not be encoded as implicit data authority.

Whether dependents consume paid seats is likewise a pricing choice. The identity, participation, and authorization model works either way.

## Sponsor loss and humane downgrade

An entitlement source moves through `active -> grace -> limited` rather than deleting data or rewriting relationships.

During grace:

- membership, responsibility, ownership, and grants remain unchanged;
- Kwilt names the affected source and deadline to the people who can act on billing;
- other participants are not alarmed unless their experience will actually change; and
- another valid source can take over invisibly.

In limited state:

- personal and shared data remain readable and exportable according to existing grants;
- paid-only creation, automation, or advanced management becomes unavailable or read-only according to each capability policy;
- nothing is silently deleted or reassigned;
- accepting invitations, leaving, revoking access, blocking, exporting, and resolving safety issues remain available; and
- essential caregiver release or emergency actions cannot be held hostage by a billing failure.

The duration of grace and the exact free/limited envelope remain commercial decisions. The invariant is that payment loss does not falsify relationship or data truth.

## Billing transfer

Changing the sponsor is an explicit handoff independent of Space stewardship:

1. The current billing manager invites a successor to billing responsibility only.
2. The successor sees the plan, price, renewal consequences, and people to be covered, but no private content.
3. The successor accepts and establishes a valid entitlement source.
4. The backend confirms the new source and coverage.
5. Only then does the old sponsorship end.

If the new purchase fails, the old source remains active until its real expiry. If it has already expired, the Space follows the grace contract while the successor retries. At no point does a failed billing handoff change ownership, stewardship, participation, grants, or child authority.

If the former sponsor must exit for safety, their participation can end immediately even while the plan enters recovery or grace. Nobody is forced to remain connected in order to keep billing alive.

## Product explanation

Kwilt should explain access using the source a person can act on:

- “Included through The Watanabes until October 12.”
- “You also have your own Kwilt plan, so nothing changes.”
- “Blaire will take over payment after she confirms.”
- “Your shared data is still here. Some paid creation and automation are paused.”

It should not expose receipt jargon, seat arithmetic, or a global matrix unless the person is actively managing the plan.
