# Frame: Household People And Meal Count

## What the user said

> This needs a counter, not just a name picker. I have 7 in my household,
> including a baby, but only Charlie is currently added as a child in the app.
> In the past we've talked about having the app store members of my household,
> and I think that's a good value unit, even adding their birthdays would be
> great. I see this as a potential path to monetization too, helping me pick out
> good gifts for others through affiliate motions.
>
> Remembered people could use iOS contact ingestion, and if we knew addresses
> that could make it easier to send them a gift.

## Restated in user voice

When I am planning food for the people who are actually in my home, I want to
set an honest quantity immediately and let Kwilt gradually remember the people
I care for, so it can help me show up for them without requiring everyone to
have an account or turning family life into profile administration.

## Target audience

`audience-aspirational-family-organizers` — people trying to keep ordinary
family life moving without adopting a productivity system.

## Representative persona

**Maya** is coordinating meals and meaningful moments for a household whose
members have different ages, needs, and levels of participation in Kwilt.

- Current situation: the number of people she feeds is larger than the number
  of named people currently represented in the app.
- What she is trying to do: cook enough now and remember useful, explicit
  context about the people she cares for over time, without retyping details
  already present in her contacts.
- Emotional state or tension: the app should recognize her real household
  without making her complete a family database before she can plan dinner.
- What would make this feel wrong: requiring accounts or devices for babies and
  non-participating relatives, treating people as paid seats, inferring private
  traits, or ranking gifts by affiliate payout.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — the household gets fed and meaningful
family follow-through happens with less mental load.

## Job flow step

The immediate gap is step 3 of
`job-flow-maya-feed-household-with-less-work`: **Recognize whether it fits
tonight — can I make enough?** It is currently scored 1/5. Kwilt exposes recipe
yield and selected diner identities, but Meals cannot record a quantity larger
than the modeled Household roster.

The longer-term opportunity also supports step 18, **Keep what was learned**,
which is scored 1/5. A durable, user-controlled Person record could let Kwilt
remember explicit food needs, birthdays, preferences, and occasion context
without making each fact a separate setup ritual.

## Active anchors

- `jtbd-move-the-few-things-that-matter` — set the real cooking quantity and
  reduce repeated household setup.
- `jtbd-trust-this-app-with-my-life` — keep person data explicit, private,
  correctable, and purpose-limited.
- `jtbd-invite-the-right-people-in` — distinguish a person Maya cares for from
  a person who has an account, device, membership, or capability access.

Candidate feature-brief metadata:

```yaml
serves: [jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life, jtbd-invite-the-right-people-in]
```

## Friction we're addressing

“Usually cooking for” currently conflates two independent truths: **how many
people need food** and **which known people are eating**. That makes the visible
count false whenever the real household is not fully modeled, and it makes
person-specific food needs unavailable unless someone is already a formal
Household member.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Settings → Meals → Usually cooking for.
- Existing user flow: choose active Household members; the row summary is the
  number of selected person IDs.
- Existing domain/data model: `kwilt_meal_planner_preferences` stores only
  `usual_diner_person_ids`, and the write contract requires every ID to be an
  active Household membership.
- Existing Household model: `kwilt_people` is already distinct from auth
  identity, but the current UI creates dependent children or invites people who
  participate; it does not offer a calm roster of people who simply belong in
  household context.
- Existing relationship-memory model: private People, explicit memories, and
  birthday Events already exist for Chat/Phone Agent, but they are a separate
  person system from canonical Household people.
- Existing permission posture: Kwilt deliberately avoids asking for Contacts
  access globally or uploading an address book for discovery. There is no
  Contacts dependency or usage description in the current app.
- Existing profile model: the signed-in user's own profile can store a
  birthdate; that is not a household birthday model.
- Existing UX convention: global Settings owns shared defaults, while Recipes
  and meal occurrences keep their own adjustable quantity.

Constraints to preserve:

- A meal count must work before household setup is complete.
- A Person is not automatically an app profile, paid seat, login, device user,
  Household authority grant, or content-sharing relationship.
- Named people are optional context; the count remains the authority for
  quantity.
- Birthdays and preferences are explicit, editable, and removable; they are not
  inferred from behavior.
- Contact import is contextual from Add person, previews the selected fields,
  and imports only the person the user chose. Denial leaves complete manual
  entry available.
- A postal address is purpose-limited delivery context. It is not location
  history, social discovery data, or ambient AI context, and it is not sent to
  a retailer without an explicit gift action and review.
- Food needs remain person-scoped and never claim allergy safety.
- Affiliate economics never determine recommendation rank and are disclosed at
  the outbound commerce action.

Constraints we may challenge:

- The assumption that every meaningful household person must be an active
  Household participant.
- The current coupling between diner count and selected person IDs.
- The split between canonical Household people and private relationship-memory
  people.

Design implication:

Meals needs two fields, not a more elaborate picker: an authoritative usual
count and an optional set of known diners for person-specific context. Household
can then grow a reusable Person record separately, with optional birthday and
relationship details, without requiring account participation. Add person can
offer a one-person iOS Contacts import with field review; it must not begin with
a full-address-book permission or upload. Gift help is a later use of that
person context, not part of meal setup and not the reason the data is collected.
The smallest trustworthy delivery aid may initially be a reviewed Copy address
action while the merchant remains responsible for checkout and fulfillment.

## Aspirational design challenge

How might we help Maya represent the real people she cares for and get the
quantity right immediately, while keeping setup lighter than the family life it
is meant to support and preserving clear privacy and commerce boundaries?

## Out of scope

- Gift recommendations or affiliate links in the Meals drawer.
- Bulk contact upload, contact-based discovery, or automated invitations.
- Requiring every diner to become a named person.
- Creating accounts, devices, or paid seats for stored people.
- Inferring birthdays, food needs, interests, or relationships.
- A generic CRM or household dashboard.

## Open question

Should imported birthdays default to month and day with year optional, while
postal addresses require a separate per-person opt-in?
