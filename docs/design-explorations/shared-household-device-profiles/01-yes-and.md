# Yes-And: Shared Household Device Profiles

## Original idea

Enroll a family iPad as a trusted Household device so real family members can switch into their own bounded Kwilt experience without sharing an adult credential or creating unused placeholder profiles.

## Adjacencies

**Yes, and what if it could...** return the iPad to a privacy-safe household welcome screen whenever a person finishes, the app backgrounds, or a short idle period expires?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Family members can share the hardware without staying vigilant about who can see the previous person's life.
- New value: Safe handoff becomes part of the device model instead of a habit every person must remember.
- Cost delta vs. original: low
- Anti-pattern check: pass; it reduces exposure without adding monitoring or urgency.

**Yes, and what if it could...** offer a temporary guest seat for a game or one shared family moment without creating a Household member or durable global identity?

- Serves: `jtbd-help-us-enjoy-being-together`
- Job elevation: Participation can begin immediately when durable identity would be unnecessary administration.
- New value: The model preserves the useful simplicity already present in local Games instead of turning every participant into an account.
- Cost delta vs. original: low
- Anti-pattern check: pass; the guest remains local and is not converted into a profile through a dark pattern.

**Yes, and what if it could...** let an existing 13+ Kwilt member link their personal account to the family iPad through a one-time QR or nearby approval from their own device?

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: A real person gains a convenient second entry point without sharing credentials or repeating full OAuth on a communal screen.
- New value: Personal-device and shared-device use become continuous while their private account remains independently owned.
- Cost delta vs. original: medium
- Anti-pattern check: pass; the link is explicit, revocable, and person-specific.

**Yes, and what if it could...** open each person into a small, capability-owned landing state containing only what they are allowed and ready to do there?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: Switching profiles leads to an immediate useful action instead of a family administration dashboard.
- New value: A teen might see their To-dos and an active meal choice; an adult sees their normal Kwilt, subject to fresh authorization for sensitive areas.
- Cost delta vs. original: medium
- Anti-pattern check: pass if this is a calm receiving surface rather than a KPI grid or household feed.

**Yes, and what if it could...** distinguish “use this profile” from “act as an adult,” requiring fresh adult authentication only when authority or sensitive data is crossed?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Ordinary participation stays quick while consequential actions remain attributable and protected.
- New value: Profile PINs cannot silently become keys to Money, provider connections, Household administration, deletion, billing, or another person's private content.
- Cost delta vs. original: medium
- Anti-pattern check: pass; progressive authorization avoids both blanket exposure and constant friction.

**Yes, and what if it could...** let an adult remotely review and revoke the family iPad's enrollment, linked profiles, and outstanding sessions from their personal device?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: A lost, sold, or repurposed shared device does not become a permanent family-data liability.
- New value: Trust survives device lifecycle changes and household transitions.
- Cost delta vs. original: medium
- Anti-pattern check: pass if it shows access state and revocation, not surveillance of what each person did.

**Yes, and what if it could...** eventually support a parent-authorized under-13 managed identity on the enrolled device without pretending that identity is an ordinary independent account?

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: A child could participate directly when Kwilt has a real consent, access, deletion, minimization, and provider-safety contract.
- New value: The shared-device architecture provides a credible future home for managed child use rather than forcing it into today's adult OAuth path.
- Cost delta vs. original: high
- Anti-pattern check: pass only if consent and child-data protections precede collection; otherwise this adjacency fails and remains excluded.

**Yes, and what if it could...** carry household continuity through an adult's account deletion by keeping device enrollment and member access attached to the surviving Household owner?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: A family device does not break or expose data merely because one adult leaves Kwilt or ownership changes.
- New value: Device enrollment becomes part of explicit Household stewardship, making deletion and succession more coherent.
- Cost delta vs. original: high
- Anti-pattern check: pass only with explicit successor acceptance and no silent child promotion.

## Job elevation

The bigger job is not “multiple profiles on an iPad.” It is letting a real household share an entry point into Kwilt without sharing identity, authority, or private life. The device is a trusted doorway; it is not the family itself and it does not own family data.

## Frame recommendation

**Run the design-thinking loop with the original frame.** The strongest adjacencies clarify safety, continuity, and activation, but they do not justify expanding the first frame into a broad family platform. The next phase should compare distinct ways to establish and switch bounded sessions on an enrolled shared device. Under-13 managed identities and household succession should remain compatibility requirements, not first-release scope.
