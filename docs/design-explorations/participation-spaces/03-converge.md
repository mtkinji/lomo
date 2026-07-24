# Converge: Person-Centered Spaces

## Chosen direction

Kwilt should adopt **person-centered Spaces** as its participation architecture:

> A Space is a named, durable boundary for repeated participation. People act through unified personal surfaces, while direct or scoped participation and explicit grants determine what each person may see or do.

Object-level copy and live sharing remain first-class. A one-off share does not create a Space. A supporter relationship does not create a Space. Spaces are earned only when a durable group repeatedly coordinates or holds shared artifacts.

## Why this direction wins

It is the only explored model that can do all of the following together:

- preserve an invisible, private, capture-first solo experience;
- give Maya one My To-dos view while allowing her to coordinate Charlie elsewhere;
- represent dependent children before they have authentication;
- grant Grandma one child/capability without exposing the household;
- let Ruth send a recipe once or maintain a durable family collection later;
- let David invite support without giving away Goal ownership;
- let Jordan participate in several contexts without switching workspaces;
- survive leave, removal, authorship, stewardship, and offline revocation; and
- transfer or lose payment without rewriting people, data, or authority.

The model clears the rubric's hard failures and critical-case threshold at the design-contract level. The decisive improvement was not a richer role system; it was separating facts that otherwise create surprising side effects.

## The stable platform model

### Person

A stable human identity independent of login, dependent status, or Space participation. A person may later bind authentication without becoming a new human in the system.

### Space

A non-nested named participation boundary for durable repeated value. It may own explicitly shared artifacts. It is never the user's global navigation mode.

### Participation

A direct relationship between a Person and a Space. It may be core, dependent, or narrowly scoped. Adult durable participation is accepted, not inferred.

### Role preset and grant

A role preset is a friendly starting bundle such as caregiver. Effective grants are the server-enforced authority, scoped to capability, object, person, or child. Relationship words never grant access by themselves.

### Owner, author, and responsible person

An owner principal holds the authoritative artifact. An author contributed it. A responsible person should see and act on it. Assignment changes responsibility, not ownership or authorship.

### Share

A copy is independent. A live share retains one authoritative source. The promise is explicit before sharing, and a Space is not required for either unless repeated group participation earns one.

### Stewardship

Stewards manage Space participation and recovery. They do not personally own everyone else's data. A successor accepts before an ordinary last-steward transfer; a safety exit can revoke first and recover administration later.

### Entitlement source

Personal purchase, Apple-shared receipt, Space sponsorship, and internal grants combine independently. Payment never grants data access and its loss never deletes data or changes relationship truth.

## User experience rules

1. **There is no global Space switcher.** My To-dos, Today, Plan, Search, Notifications, and Agent remain person-centered.
2. **Responsibility drives the personal action layer.** Source appears only when it prevents confusion.
3. **Coordination views are intentional destinations.** Maya can inspect The Watanabes or Charlie's responsibilities without carrying his chores in her own list.
4. **Collaboration UI is contextual.** Solo users do not see empty Space, assignment, or permission administration. “Assigned to” appears only when another eligible person exists or the user invokes sharing.
5. **The first person creates the first Space just in time.** Adding a household person atomically creates and names the Space; onboarding does not require an empty household setup.
6. **Access is explained in capability language.** “Can respond to Charlie's Screen Time requests” is preferable to a generic permission matrix.
7. **People see the aftermath before consequential changes.** Move, live share, leave, removal, stewardship transfer, and billing transfer each preview what changes and what does not.
8. **Offline state is honest.** Content actions may queue where safe; authority changes require server acknowledgement.

## Explicitly rejected

- a workspace-style current-Space selector;
- nested Spaces or inherited family-circle permissions;
- a generic social graph or people feed;
- universal household visibility for all capabilities;
- automatic Space creation after repeated shares;
- creating a Space for one accountability relationship;
- roles as the sole authorization mechanism;
- payment seats as membership or authority;
- duplicate Activities per assignee or Space; and
- automatic migration of personal data into a household.

## Accepted tradeoffs

- The backend must resolve unified projections across several authorized sources; simpler per-workspace querying is not worth the user burden.
- Capability teams must declare ownership, fields, grants, offline policy, exit behavior, and export rather than inheriting one universal collaboration policy.
- Some users may never encounter the word Space. That is desirable: the platform noun appears only when there is durable shared inventory to understand.
- The architecture can represent multiple households, but one managed device has one active Screen Time policy authority Space at a time.
- Specialized family-memory privacy, adversarial co-parenting, child independence, and abuse recovery need dedicated evidence and safety work. The platform contains them without claiming they are already solved.

## Activation ladder

Kwilt should introduce only the least structure the job needs:

1. **Personal:** capture privately with no participation UI.
2. **Copy:** send an independent thing once.
3. **Live share or support:** connect selected people to one object or agreement.
4. **Space:** create a named boundary when the same people need durable identity, authority, or shared inventory.
5. **Sponsorship:** optionally pay for eligible people without changing their access grants.

Kwilt may suggest the next rung after repeated behavior, but it never converts or widens access automatically.

## Initial product sequence

The architecture is broad; the learning sequence should remain narrow:

1. **Household foundation:** stable Person/dependent identity, just-in-time Space creation, invitation, stewardship, grants, audit, and exit basics.
2. **Activity assignment:** one authoritative Activity, responsibility projections, recurrence occurrences, and offline completion receipts.
3. **Chores:** a purpose-specific recurring-Activity experience, not a second task model.
4. **Managed child Screen Time:** Apple authorization, one device-policy authority, rule evaluation, quiet exception handling, and signed-device evidence.
5. **Scoped caregiver:** prove least-privilege participation with Grandma and Charlie.
6. **Copy/live sharing and support:** add only when their capability jobs are chosen for learning.
7. **Sponsorship:** implement after participation truth is stable; never use billing to compensate for missing grants.

Each checkpoint should ship or test a coherent user promise. The platform should not be built as a large generic permission system ahead of those slices.

## Stated bet

If Kwilt lets people bring in exactly the right person at the moment responsibility, support, or shared knowledge demands it—while keeping each person's own day unified and private—families will coordinate with less repeated asking and less administration than either iOS Screen Time or workspace-shaped family apps.

We will know the direction is wrong if useful sharing repeatedly requires users to understand Space membership, if people cannot explain why another person has access, or if cross-Space aggregation makes everyday personal surfaces noisy or unsafe.

## Remaining work before implementation planning

Convergence authorizes a common direction, not a monolithic build. Before changing canonical taxonomy or platform code:

- reconcile the four existing household/assignment/chore/Screen Time briefs against this model;
- decide which existing persona/job-flow gaps should be updated and which provisional jobs require evidence;
- specify the first learning checkpoint and its non-goals;
- write capability policy tables for Activities and Screen Time;
- define migration behavior for current personal Activities and existing Goal partners; and
- validate Apple FamilyControls, ManagedSettings, DeviceActivity, RevenueCat/App Store, signed-device, and offline boundaries independently.
