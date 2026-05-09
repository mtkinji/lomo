# Diverge: kwilt-text-coach-action-agent

## Axis of variation

The axis is **how much action authority Kwilt gets, and where the first WOW moment lives**:

- SMS/text as primary surface vs. in-app/desktop as primary surface.
- Personal follow-through vs. relational follow-through.
- Draft/propose-only vs. permissioned action inside Kwilt.
- One-user private agent vs. household/shared memory agent.

## Alternative A — Text Follow-Through Coach

Kwilt gives the user a number to text. The user can text intentions, commitments, or outcomes in natural language: "Call Dad this weekend," "I owe Alex an apology," "Mara tryouts Friday," "I want to make Family Stewardship real this week." Kwilt saves the intention as an Activity or follow-through prompt, asks at most one clarifying question, follows up at the right time, offers drafts or next-step help, and closes the loop with minimal replies like "done," "snooze 2d," "pause," or "not relevant." The first version is one-user, private-by-default, and acts only inside Kwilt unless drafting text for the user to send.

- Touches the four-object model at: Activities as primary action object; Goals/Arcs as optional context; Chapters as later reflection input; no Chapter planning.
- Capture-first stance: strong; texting is capture-first and should never require Arc/Goal selection.
- Force Intent vs Actual implication: follow-through outcomes become Activity evidence; optional Force Actual can be suggested, not silently written.
- Persona fit: very strong for the overextended intention-holder because it meets intentions where they arise.
- Design-challenge answer: strong; carries intention across time through text while preserving user authorship.
- Best when: the monetizable WOW is "I texted Kwilt and it helped me actually follow through later."
- Fails when: SMS costs/compliance or tone risks make proactive messaging feel invasive.
- Anti-pattern check: pass if prompts are capped, easy to pause, non-anthropomorphic, and no external auto-send occurs.

## Alternative B — Relational Chief Of Staff

Kwilt absorbs the Kwilt-keep wedge more directly: a text-native relational memory and follow-through system. The user texts people-specific facts, milestones, cadences, and tensions. Kwilt remembers meaningful details, prompts at the right moments, drafts thoughtful messages, and logs whether the user followed through. This can later support household members with private/shared memory, but v1 can be a private "show up for people" Pro surface connected to Connection-heavy Arcs.

- Touches the four-object model at: Activities for relational actions; Goals/Arcs for identity context; a future Person/Memory model adjacent to Kwilt objects.
- Capture-first stance: strong; natural text capture is the core.
- Force Intent vs Actual implication: rich Connection Force Actual evidence.
- Persona fit: strong, especially when the user's felt pain is relational follow-through.
- Design-challenge answer: strong for care-oriented follow-through; narrower for non-relational Goals.
- Best when: paid willingness is highest around "help me be the kind of person who remembers and shows up."
- Fails when: it feels like a separate CRM/household product instead of Kwilt's life architecture.
- Anti-pattern check: risky but fixable; must avoid surveillance/contact scraping, default-public sharing, and autonomous outreach.

## Alternative C — Permissioned Activity Agent

Kwilt introduces an explicit agent-permission system. The user can grant standing permission for narrow Activity-level actions: "create Activities from my texted intentions," "follow up on open Activities," "snooze stale Activities after asking once," "turn Chapter insights into draft Activities." Text is one input channel, but the core product is action authority inside Kwilt. The agent does not start with SMS-only magic; it starts with a general permissioned action substrate that app, desktop, connector, and text can all use.

- Touches the four-object model at: Activities first; Goal changes proposed; Arcs never silent; Chapters retrospective input.
- Capture-first stance: safe if capture remains ungated and agent action is optional.
- Force Intent vs Actual implication: can expose Intent/Actual mismatch through action suggestions, not scores.
- Persona fit: medium; powerful but less immediately emotional than text follow-through.
- Design-challenge answer: strong for trust/permissions, weaker for text-native immediacy.
- Best when: the strategic priority is an extensible Pro platform for many future agents.
- Fails when: permissions feel abstract and users do not understand what they are paying for.
- Anti-pattern check: pass if permissions are plain-language, reversible, and action logs are visible.

## Alternative D — Chapter-to-Action Concierge

After a Chapter is generated, Kwilt texts or notifies the user with one or two action follow-ups: "Want me to carry one of these forward this week?" The user can reply in text, and Kwilt creates Activities or follow-up prompts. This gives Chapters an action bridge without putting future planning inside the Chapter body.

- Touches the four-object model at: Chapters as retrospective input; Activities as output; Goals/Arcs as context.
- Capture-first stance: neutral; this is reflection-time, not capture-time.
- Force Intent vs Actual implication: can identify mismatch patterns as gentle action prompts.
- Persona fit: medium; useful if the user reads Chapters, weaker if the intent appears outside reflection.
- Design-challenge answer: partial; carries some intentions forward but misses spontaneous text-native capture.
- Best when: the goal is to make Chapters feel more valuable and monetizable.
- Fails when: the strongest WOW moments happen before/after the Chapter, not inside it.
- Anti-pattern check: pass only if Chapter remains retrospective and action lives in a separate flow.

## Alternative E — Household Keep Inside Kwilt

Kwilt ships Kwilt-keep as a native household plan: multiple members, shared/private memory, SMS capture, reminders, drafts, and loop closure. It is a separate paid tier or family add-on, built around relational follow-through rather than individual Arc/Goal progress.

- Touches the four-object model at: indirectly; introduces Person/Memory/Member objects that sit partly outside Arcs/Goals/Activities/Chapters.
- Capture-first stance: strong in SMS, but complexity rises with shared/private scope.
- Force Intent vs Actual implication: Connection evidence could map back into Activities, but not by default.
- Persona fit: strong for households, weaker for solo Kwilt users.
- Design-challenge answer: strong for relational care, weak for preserving Kwilt's core object simplicity.
- Best when: the business wants a distinct family/household product line.
- Fails when: it distracts from Kwilt's core personal life architecture and creates another app inside the app.
- Anti-pattern check: risky; high privacy and social-default risk unless scoped very carefully.
