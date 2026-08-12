# App Store Privacy Disclosures — Kwilt 1.0.104 (104)

**Prepared:** August 12, 2026
**Canonical policy:** `https://go.kwilt.app/privacy`
**Canonical Terms/EULA:** `https://go.kwilt.app/terms`
**Tracking:** No

Use this packet for App Store Connect only after the August 12, 2026 Privacy Policy is live. App Store Connect answers describe the submitted binary, including optional features and integrated third-party code. They are separate from `PrivacyInfo.xcprivacy`, which primarily carries required-reason API and SDK privacy-manifest declarations.

## Data types to select

| Apple data type | Collected | Linked to user | Tracking | Purposes to select | Kwilt evidence |
|---|---:|---:|---:|---|---|
| Contact Info → Name | Yes | Yes | No | App Functionality, Product Personalization | Apple/Google profile, household/player display name |
| Contact Info → Email Address | Yes | Yes | No | App Functionality, Developer's Advertising or Marketing | Sign-in identity, invite/support/product email, calendar-provider identity |
| Contact Info → Phone Number | Yes, optional when Phone Agent is enabled | Yes | No | App Functionality | Phone Agent verification and linked SMS destination |
| Health & Fitness → Health | Yes, optional | Yes | No | App Functionality, Product Personalization | Authorized sleep/mindfulness summaries; user-entered dietary needs can be health-related |
| Health & Fitness → Fitness | Yes, optional | Yes | No | App Functionality, Product Personalization | Authorized activity/workout/steps/active-day summaries |
| Financial Info → Other Financial Info | Yes, optional | Yes | No | App Functionality, Product Personalization | Plaid institution/account/balance/transaction data; budgets, allocations, forecasts, merchant/category evidence |
| Location → Precise Location | Yes, optional | Yes when signed-in sync is used | No | App Functionality, Product Personalization | Explore paths/visits/Places, background recording, place/reminder flows |
| Location → Coarse Location | Yes, optional | Yes when signed-in or provider lookup is used | No | App Functionality, Product Personalization | Approximate permission, ZIP/nearby/store/place lookup, IP-derived server location if retained |
| User Content → Photos or Videos | Yes, optional | Yes | No | App Functionality, Product Personalization | Attachments, covers, recipe imports/media, AI image input |
| User Content → Audio Data | Yes, optional | Yes when stored with an account; transient for some voice paths | No | App Functionality, Product Personalization | Chat voice, transcription, live conversation, audio notes, recipe voice import |
| User Content → Emails or Text Messages | Yes, optional when Phone Agent is enabled | Yes | No | App Functionality | Inbound/outbound Phone Agent SMS and delivery state |
| User Content → Gameplay Content | Yes, optional | Yes for authenticated remote rooms/profiles | No | App Functionality | Private room state, moves, scores, submissions, votes, personal bests |
| User Content → Customer Support | Yes, optional | Yes | No | App Functionality | Support requests and related account/context supplied by the user |
| User Content → Other User Content | Yes | Yes when synced/account-backed | No | App Functionality, Product Personalization | Planning, Chat, recipes, meals, groceries, household/dependent records, calendar content, attachments metadata, connected-tool actions |
| Search History | Yes, optional | Can be linked when results are saved to an account | No | App Functionality, Product Personalization | Place, image/GIF, recipe, retailer/store/product searches where request or selected result is retained |
| Identifiers → User ID | Yes | Yes | No | App Functionality, Analytics, Product Personalization | Supabase user/person/household IDs, RevenueCat customer ID, PostHog distinct ID |
| Identifiers → Device ID | Yes | Yes or pseudonymously linked | No | App Functionality, Analytics | Install-scoped ID, push token, app/device identifiers used for quotas, delivery, diagnostics |
| Purchases → Purchase History | Yes | Yes | No | App Functionality, Analytics | Apple/RevenueCat product, purchase, restore, trial, and entitlement state |
| Usage Data → Product Interaction | Yes | Yes or pseudonymously linked | No | Analytics, App Functionality, Product Personalization | Privacy-minimized feature events, notifications, invites, widgets, AI usage, game lifecycle, adoption |
| Usage Data → Other Usage Data | Yes | Yes or pseudonymously linked | No | App Functionality, Analytics | Quota/rate records, provider status, action history, authorization/audit events |
| Diagnostics → Performance Data | Yes | Can be linked | No | App Functionality, Analytics | Latency, duration, provider status, sync freshness/performance |
| Diagnostics → Other Diagnostic Data | Yes | Can be linked | No | App Functionality, Analytics | Error/status logs, build/device metadata, security and delivery diagnostics |

## Data types not represented as separate Apple rows

- Calendar events/availability and files/documents belong under **Other User Content** for Apple, while Google Play has separate Calendar and Files categories.
- Bank credentials are not collected by Kwilt. Plaid Link handles institution authentication. Do not select Payment Info merely because Kwilt has subscriptions or bank connections; Apple handles App Store payment details, and Kwilt processes entitlement/purchase history instead.
- Face ID output and Apple Family Controls application/category tokens stay on-device and are not collected by Kwilt.
- HealthKit source records remain controlled by Apple Health, but authorized summaries synced to Kwilt are collected and must be declared.

## Tracking answers

Answer **No** to tracking for every selected type. Kwilt does not link data from the app with third-party data for advertising or advertising measurement, does not sell data to data brokers, and does not use the advertising identifier for cross-company tracking.

PostHog is used for product analytics/feature flags, not cross-context advertising. OpenAI, Supabase, Plaid, RevenueCat, Resend, and the other named vendors act as service providers or fulfill an explicit user-directed connection; their integrated SDK/API practices still need to remain consistent with this answer.

## Privacy URLs

- Privacy Policy URL: `https://go.kwilt.app/privacy`
- Privacy Choices URL: use `https://go.kwilt.app/privacy#privacy-choices` only after that stable fragment/route exists; otherwise leave the optional field blank.
- Terms of Use (EULA): `https://go.kwilt.app/terms`

## Permission/reviewer paths

1. **Legal:** Settings → Legal & privacy.
2. **Account deletion:** Settings → Account settings → Delete account. Explain separately that Apple subscriptions are not cancelled.
3. **Money/Plaid:** Money → setup/accounts → Connect through Plaid. The review build must either provide a working production/reviewer-safe connection or make the unavailable state truthful.
4. **Explore:** Explore → begin a manual recording or enable Automatic Exploring. Foreground and background permission requests occur in context; recording remains private.
5. **Recipes/Meals/Groceries:** Meals/Recipes → import or save; Grocery List → Shop online → select/connect retailer when enabled.
6. **Games/local network:** Games → open or join a nearby private table. Local-network access is used only during foreground discovery.
7. **Household/dependents:** Settings → Household. Adult creates a parent-managed dependent profile and explicitly grants a capability.
8. **Screen Time:** Settings → Screen Time. Apple app/category selections stay on the configured device.
9. **Voice/microphone:** Chat voice or Conversation Mode; recipe cooking voice uses separate generated speech behavior.
10. **Calendar/Health:** Settings → Calendars; Settings → Weekly Chapters → Apple Health summaries.

## Release evidence gates

- [ ] August 12 policies are deployed and all `kwilt.app`, `www.kwilt.app`, and `go.kwilt.app` legal URLs resolve to them.
- [ ] App Store Connect preview shows the selected data types above and Tracking = No.
- [ ] The Privacy Policy URL is published in App Store Connect.
- [ ] Signed-device prompts match `app.config.ts` for location/background location, microphone, photos/camera, Calendar/Reminders, Apple Health, local network, Face ID, notifications, and Family Controls.
- [ ] A disposable account exercises deletion after using every cloud capability; Auth, database, Storage, Plaid, retailer/calendar/tool tokens, and local-cache results are recorded.
- [ ] The submitted build and screenshots do not expose a provider flow that is remote-disabled or unreviewable.
- [ ] Counsel reviews eligibility/dependents, financial terms, food/health disclaimers, arbitration, regional rights, and shared-record retention.
