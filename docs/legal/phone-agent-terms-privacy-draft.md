# Phone Agent Legal Language Draft

This file preserves dormant Phone Agent / SMS legal, privacy, and program language while the feature is hidden from the live Kwilt app and public App Store review surfaces.

Do not treat this as active legal copy until Phone Agent is usable in the submitted app, Twilio/A2P approval is complete, App Privacy answers include phone/SMS data, and the live Terms/Privacy pages are intentionally updated.

## Terms Draft

These Terms also govern **Kwilt Phone Agent**, our optional transactional and conversational SMS feature for Kwilt app users. Public SMS program details, including opt-in and support information, are available at `/phone-agent#program`.

Kwilt Phone Agent is optional. You can use Kwilt without enabling SMS, and you can disable Phone Agent texts at any time in the App or by replying `STOP`.

### Key Definitions

- **Services**: the Kwilt app, Kwilt Phone Agent SMS, our websites, and related support flows and features.
- **Kwilt Phone Agent**: an optional transactional and conversational SMS feature used for phone verification, saved notes, activity capture, optional reminder prompts, and account activity by text message.

### Description Of Services

Some Services may also be offered over SMS. Kwilt Phone Agent lets Kwilt app users optionally link a phone number, save notes or activities, receive user-enabled reminder prompts, and coordinate account activity by text message.

Kwilt Phone Agent is not required to create an account or use Kwilt. Not every Kwilt app user uses Phone Agent.

### Accounts And Authentication

Some services, including Kwilt Phone Agent SMS, require a verified phone number. In those cases, we may use your phone number, in-app verification, and message-based opt-out/help interactions to administer access to the feature.

### Kwilt Phone Agent SMS

Kwilt Phone Agent is a transactional and conversational SMS feature. By opting in, you agree that we may send you text messages related to phone verification, saved notes, activity capture, optional reminder prompts, support flows, and account activity.

Kwilt Phone Agent is not intended for marketing or promotional campaigns. Message frequency varies based on your activity and settings, and message and data rates may apply.

You may opt in to Kwilt Phone Agent from inside the Kwilt mobile app by going to Settings > Phone Agent, entering your phone number, requesting a verification code, and entering that code in the app. You may opt out at any time by replying `STOP`. You may request help by replying `HELP`. If you previously opted out, replying `START` can re-enable SMS for a verified number.

Carriers and messaging providers are not liable for delayed or undelivered messages. We may suspend or limit SMS access to protect the service, comply with law, or prevent abuse.

## Privacy Draft

This Policy also applies to **Kwilt Phone Agent**, our optional transactional and conversational SMS feature for Kwilt app users. Public SMS program details are available at `/phone-agent#program`.

Kwilt Phone Agent is optional. You can use Kwilt without enabling SMS, and you can disable Phone Agent texts at any time in the App or by replying `STOP`.

### At A Glance

Some features send data off-device, such as sign-in and shared goals, AI coaching via an AI proxy, attachments uploads, analytics, subscription entitlement checks, optional calendar/Apple Health integrations, Kwilt Phone Agent SMS, and optional connected AI tools that you authorize through Kwilt MCP.

### Scope And Key Definitions

- **Service**: the Kwilt app, Kwilt Phone Agent SMS, our websites, and related features and support flows.
- **Kwilt Phone Agent**: an optional transactional and conversational SMS feature that lets Kwilt app users text their own Kwilt account to save notes, create activities, and receive user-enabled follow-up prompts.

### Local-First Data Handling

Cloud-processed data is feature-dependent. Using AI coaching, shared goals, attachments uploads, analytics, subscriptions, certain link/invite flows, and Kwilt Phone Agent SMS will transmit specific data off-device.

### Information We Collect

We collect information depending on how you use the App, Kwilt Phone Agent, and the Service more generally.

**Kwilt Phone Agent SMS data.** If you use Kwilt Phone Agent, we may process your phone number, SMS message content, message metadata such as timestamps, sending and receiving numbers, carrier/provider message IDs, opt-in or opt-out status, verification-code state, and delivery or help/stop interactions needed to operate the SMS feature and maintain compliance.

**Kwilt Phone Agent opt-in.** You enable Phone Agent from inside the Kwilt mobile app by going to Settings > Phone Agent, entering your phone number, requesting a verification code, and entering that code in the app. The feature is optional and is not required to create or use a Kwilt account. See program details at `/phone-agent#program`.

### Purposes Of Processing

We use information to provide Kwilt Phone Agent SMS, including phone verification, save confirmations, optional reminder prompts, and support flows.

### Third-Party Processors And Services

**Messaging provider(s)** send, receive, route, and administer Kwilt Phone Agent SMS, including opt-in, help, and opt-out handling.

### Data Retention And Deletion

**Kwilt Phone Agent SMS records.** We may retain phone numbers, message history, verification state, opt-in/opt-out state, and related messaging logs for support, abuse prevention, legal compliance, and service reliability for a limited period consistent with operational needs.

### Your Choices And Controls

**Kwilt Phone Agent SMS.** You can opt out of Kwilt Phone Agent SMS at any time by replying `STOP`. You can request help by replying `HELP`. Standard message and data rates may apply.

## SMS Program Disclosure Draft

Kwilt Phone Agent is a transactional and informational SMS feature, not a marketing or promotional campaign.

Users opt in from inside the Kwilt mobile app by opening Settings > Phone Agent, entering a phone number, requesting a verification code, and entering that code in the app. The feature is optional and is not required to create an account or use Kwilt.

Message frequency varies based on user activity and settings. Default follow-up prompts should be limited by product controls, for example up to 3 per day unless the user changes settings.

Message and data rates may apply. Reply `STOP` to opt out, `HELP` for help, and `START` to re-enable SMS for a verified number after opting out.

Carriers are not liable for delayed or undelivered messages.

Terms: `https://www.kwilt.app/terms`

Privacy: `https://www.kwilt.app/privacy`

## Twilio / A2P Notes

- SMS consent must be optional.
- Any web SMS-interest form must submit successfully without SMS consent.
- No SMS checkbox should be pre-checked.
- If SMS consent is checked, a valid mobile number is required.
- Downstream systems must not send SMS unless transactional SMS consent is true and the phone number is valid.
- Do not log raw phone numbers in production logs; redact or treat support exports as sensitive.
- Re-promote this language only when Twilio/A2P approval is complete and the app exposes Settings > Phone Agent again.
