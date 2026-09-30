# Phone Agent concept reset — September 24, 2026

Status: provisional frame for discussion; not an implementation decision.

## What Andrew said

> I have this vague notion that I want to chat with my AI tools, like chatgpt and Kwilt, over the phone. I wanted to get to a rapid test to start exploring that space. Nothing has been rapid about it and now I want to stabilize the concept before going further.

The goal is to stabilize the concept before further implementation or carrier submission. Earlier SMS-first implementation decisions are inputs, not constraints on this exploration. Kwilt Keep is retired branding; the feature is Kwilt Phone Agent.

## User-voice frame

When I want help from an AI while away from its usual interface, I want to reach it through my phone and have a useful conversation, so the moment is not lost to setup, navigation, or reconstructing context.

This is a hypothesis. Andrew's actual trigger, preferred modality, and expectations about existing AI context still need to be established.

## Audience and anchors

First learner: Andrew, using real situations from his own life. Closest existing audience: `audience-ai-native-life-operators`, represented by Nina. Her hero job is `jtbd-trust-this-app-with-my-life`.

Strong supporting candidates:

- `jtbd-get-help-without-retelling-my-life`: continuity may be more important than the phone number itself.
- `jtbd-capture-and-find-meaning`: preserve useful thoughts when the normal interface is inconvenient.
- `jtbd-stay-in-control-of-ai-actions`: distinguish conversation from authorized changes if actions prove necessary.

serves: [jtbd-get-help-without-retelling-my-life, jtbd-capture-and-find-meaning, jtbd-stay-in-control-of-ai-actions]

The current Nina job flow includes ordinary-language expression, bounded context, evidence, proportional review, receipts, and resume. Its published scores describe existing Chat evidence, not working phone access. The gap here is an unproven phone interaction and its value, not a missing generic agent architecture.

## System alignment

Constraint posture: **Question the system** for the learning path; preserve identity, authorization, and truthful completion behavior.

Current evidence:

- The existing Phone Agent brief includes both calls and SMS, then expands into relationship memory, events, cadences, proactive prompts, and action governance.
- The existing convergence artifact chose SMS follow-through as the first proving ground while retaining calls in the parent concept.
- Current app source exposes phone verification and SMS disclosures. This is not evidence of a live voice-call experience.
- The live Twilio inspection in this thread found an approved brand, a rejected 10DLC campaign, and toll-free registration not started. No completed real-phone exchange has been established here.
- The messaging service was renamed to Kwilt Phone Agent (Prod). Campaign branding and URL edits are in an open, unsubmitted form.

Design implication: transport readiness and product desirability are different questions. We should not let the SMS campaign dictate the experiment before knowing which experience Andrew wants to learn about.

## Decisions to separate

1. Interaction: asynchronous text, live spoken conversation, or continuity between both.
2. Identity and context: a new helpful agent, the Kwilt agent with Kwilt context, or access to an existing external AI conversation.
3. Outcome: think together, capture a durable result, or execute an account action.
4. Access: a dialable number is essential, or merely one possible way to reduce friction.

An AI model connection must not be represented as access to Andrew's existing ChatGPT conversations, memory, or connected tools. Any such continuity needs separate feasibility evidence after the desired experience is clear.

## Aspirational design challenge

How might we let Andrew reach the AI help he wants in the moment, with enough continuity to be useful and a clear result afterward, while learning quickly without building a whole new assistant product first?

## Not yet decided

Voice versus SMS; one agent versus multiple; context requirements; actions; proactive outreach; target transport; implementation scope. No new product commitment is made by this frame.

## First question

Picture the moment that made you want this: what are you doing, what would you say, and is the interaction primarily a live voice call, texting, or both?

## Completion criteria for concept work

- Andrew recognizes the triggering situation and intended outcome.
- We distinguish phone access, context continuity, and action authority.
- We compare at least three materially different approaches against that situation.
- We choose a provisional concept and explicit exclusions together.
- We define a feasible first experiment, what it would prove, what it would not prove, and a decision rule after use.

None of these criteria requires shipping the current SMS implementation first.

## Feasibility clarification — official documentation checked September 24

The SMS rejection should not be treated as a universal blocker for phone interaction. Twilio describes A2P 10DLC registration as a requirement for application-originated text messages from US local numbers. Its inbound voice documentation describes a separate phone-number/webhook path. OpenAI documents connecting inbound telephone calls to Realtime through a SIP provider such as Twilio. Inference: a voice-only experiment can be investigated independently of this SMS campaign; that does not establish that our existing numbers, account configuration, or backend are ready for calls.

Sources:
- [Twilio A2P quickstart](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/quickstart)
- [Twilio inbound voice](https://www.twilio.com/docs/voice/tutorials/how-to-respond-to-incoming-phone-calls)
- [OpenAI telephony and SIP](https://developers.openai.com/api/docs/guides/voice-sip)

OpenAI's documented setup creates a project-owned Realtime session with application-supplied instructions. The fetched guide does not establish access to a personal ChatGPT account's history, memory, or connected apps. Treat existing-ChatGPT continuity as an unresolved integration requirement, not an automatic property of an OpenAI-powered phone call.

This creates three separate feasibility questions after Andrew clarifies the trigger:

| Intended experience | First evidence needed | What would be insufficient |
| --- | --- | --- |
| Call an AI to think aloud | A useful real spoken exchange through the intended access surface | A successful SMS response |
| Continue an existing AI conversation | The intended conversation's authorized context is actually available and correctly resumed | A generic agent using a similar model |
| Operate Kwilt by phone | Correct account context, proportionate authorization, and a verified result in Kwilt | The agent merely saying it made the change |

No transport, provider, or experiment is selected by this clarification. The original use-case question remains open.
