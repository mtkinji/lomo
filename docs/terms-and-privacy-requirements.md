## Kwilt — Terms of Service + Privacy Policy Requirements (product-driven)

This document is **not legal advice**. It is a **product/engineering requirements brief** that enumerates the specific Terms of Service (ToS) and Privacy Policy disclosures Kwilt needs, based on the current app architecture and feature set in this repo.

Kwilt is a **local-first** mobile app that can optionally use cloud services for:
- **Sign-in and shared goals** (Supabase Auth + Edge Functions)
- **AI coaching** (via a Supabase Edge Function “AI proxy”; no OpenAI key in the client)
- **Media/attachments uploads** (Supabase Storage via Edge Functions)
- **Analytics** (PostHog; with client-side redaction of user-entered text fields)
- **Subscriptions** (RevenueCat; Apple subscriptions)

---

### Scope & vocabulary (must be consistent across policies)

- **App**: the Kwilt mobile app.
- **Local-first**: your Arcs/Goals/Activities and profile live on-device by default; some features call cloud services.
- **Kwilt account**: a Supabase Auth identity (Sign in with Apple/Google).
- **Shared goal**: a goal with memberships; supports invite links and a “signals-only” default.
- **Signals-only**: check-ins + lightweight reactions/cheers by default; **activity titles/notes are not shared** unless explicitly enabled.
- **AI proxy**: the server endpoint the app uses to call LLM providers (e.g., OpenAI) with quotas/limits.

---

### 1) Terms of Service — requirements

#### 1.1 Service description + user eligibility
- **Describe the service** as personal planning/coaching support (Arcs, Goals, Activities, reminders, optional AI assistance, optional collaboration).
- **Age/eligibility**:
  - Minimum age requirement (e.g., 13+ or 16+ depending on target + regional rules).
  - If minors are permitted, require parental consent language; otherwise, explicitly prohibit use by children under the threshold.

#### 1.2 Accounts and authentication (optional, intent-gated)
- **Account is optional** for core local use; **required** for certain features (sharing/joining shared goals, uploading attachments, etc.).
- **Sign-in methods**: Sign in with Apple and Google (via Supabase Auth).
- **Session handling**: ToS should allow maintaining sessions on the device.
- **Logout semantics** must match product posture:
  - Logging out disconnects the cloud identity but **does not automatically delete local data**.
  - Provide a separate “Erase local data” action (if supported) for shared-device privacy.

#### 1.3 User content, ownership, and license
Kwilt stores and processes user-generated content including:
- Arc/Goal/Activity titles, descriptions, notes, steps, tags
- Profile/identity fields (e.g., identity summaries, coaching context text)
- Shared-goal check-ins + reactions (when implemented)
- Attachments (photos/videos/documents/audio recordings) when enabled

ToS must:
- **Confirm user ownership** of user content (subject to third-party rights).
- Grant Kwilt a **limited license** to host/process/display user content solely to operate the service (including sharing to invited members when the user enables sharing).
- Include **content responsibility**: user represents they have rights to upload/share content, especially attachments and shared-goal check-ins.

#### 1.4 AI features — limits, disclaimers, and acceptable use
Kwilt includes AI-assisted coaching flows and may send user-provided text and derived summaries to the AI proxy.

ToS must include:
- **No professional advice** disclaimer (not medical/mental health/legal/financial advice).
- **Accuracy and reliance** disclaimer (AI can be wrong; user is responsible for decisions).
- **Safety & prohibited use**:
  - No illegal content; no abuse/harassment; no content that violates others’ privacy/rights.
  - No attempts to extract secrets or abuse quotas/rate limits.
- **Rate limiting / quotas**:
  - Kwilt may enforce free/pro quotas, daily rails, and suspend abusive usage.
  - Define consequences for exceeding limits (throttling, paywall, temporary blocks).
- **Model/provider changes**: Kwilt may change models/providers without notice, while preserving core service behavior.

#### 1.5 Collaboration: shared goals + invites
ToS must clearly define:
- **Invite links** and who is responsible for link sharing; links may grant access to a shared goal experience.
- **Signals-only default** and user controls:
  - What’s shared by default (membership + check-ins + reactions).
  - What is not shared by default (activity titles, notes, attachments) unless explicitly opted in.
- **Member conduct** expectations (no harassment; no doxxing; no sharing others’ data).
- **Termination/removal**:
  - Users can leave shared goals; owners/admins (if supported) can remove members/revoke invites.
  - Kwilt may disable collaboration features if abuse is detected.

#### 1.6 Attachments (photos/videos/audio/documents)
If attachments are available:
- **Permission-based access**: photo library / microphone permissions are user-controlled via OS.
- **Storage + access**:
  - Attachments are uploaded to cloud storage when user initiates upload and is signed in.
  - Access is controlled by authentication and server-side authorization.
- **Sharing toggle**:
  - If “share with goal members” exists, ToS must state that enabling it makes that attachment accessible to members (and may remain accessible until unshared/deleted).

#### 1.7 Notifications
- Local notifications are best-effort and can be disabled by the user in OS settings.
- Notification content can include activity/goal titles (user-generated text).
- Kwilt is not liable for missed or delayed notifications (OS/battery settings).

#### 1.8 Calendar export
Kwilt can generate and share an `.ics` file (calendar export).
- Clarify it’s **export-only** (not full calendar sync), unless/ until OAuth sync is introduced.
- User is responsible for choosing where to share/import the `.ics` file; third-party calendar providers are governed by their own terms.

#### 1.9 Subscriptions, billing, and trials (RevenueCat / Apple)
ToS must include:
- **Free vs Pro** (and “Pro Tools Trial” if offered): define what unlocks are included (object limits, tools like scheduling, attachments, etc.).
- **Billing**:
  - Purchases are handled by Apple; cancellation/refunds governed by Apple’s policies.
  - Restores supported.
  - Family Sharing behavior (if enabled) is governed by Apple.
- **Entitlement reliability**:
  - Offline behavior: last-known entitlement may be used for a bounded window; clarify user responsibility to reconnect for billing verification.

#### 1.10 IP, DMCA, and takedowns
- Standard IP ownership for the app and trademarks.
- If user-uploaded content is hosted, include DMCA/takedown process (or local law equivalent).

#### 1.11 Availability, changes, and termination
- Service may be modified/discontinued; ToS should include notice language.
- Account termination/suspension for ToS violations.

#### 1.12 Disclaimers, limitation of liability, indemnity
- Standard warranty disclaimers, limitation of liability, and indemnity appropriate to an AI-enabled planning/coaching app.

---

### 2) Privacy Policy — requirements

#### 2.1 “Local-first” data handling disclosure (must be explicit)
Privacy Policy must clearly distinguish:
- **On-device data** (stored locally by default): Arcs/Goals/Activities, user profile fields, preferences, drafts, and other workspace state.
- **Cloud-processed data** (only when user uses specific features): AI proxy requests, shared-goal membership/invites, attachments uploads, analytics events, subscription entitlement checks.

Users should understand: **using AI, sharing, or attachments will transmit certain data off-device**.

#### 2.2 Categories of personal data (map to actual app behavior)
At minimum, document these categories and examples:

- **Account/identity data (if user signs in)**:
  - User ID, email (optional), name (optional), avatar URL (optional), auth provider (Apple/Google).
- **User-generated content (UGC)**:
  - Arcs, goals, activities (titles, descriptions, notes, steps, tags, schedules).
  - “Coach context” text (long-form identity/background), plus summarized “coach context summary”.
  - Shared-goal check-ins + reactions (when implemented).
- **Attachments (if enabled)**:
  - Photos/videos/documents/audio recordings uploaded by the user.
  - Metadata (filename, MIME type, size, timestamps); sharing flag (shared with goal members).
- **Device/app identifiers**:
  - Install-scoped identifier (install ID) used for quotas/abuse prevention/attribution (stored on device; sent in headers like `x-kwilt-install-id`).
- **Usage and diagnostics**:
  - Analytics events (e.g., onboarding started/completed, notification opened, paywall viewed, invite created/accepted).
  - App lifecycle and basic device/app metadata as collected by the analytics SDK.
- **Notifications data**:
  - Notification preferences and in-app ledgers for scheduling/open tracking (local-first).
  - Notification content may include user-entered text like activity titles.
- **Subscription/billing data**:
  - RevenueCat customer/entitlement state; purchase metadata/receipts handled by Apple/RevenueCat.
- **Location data (if enabled)**:
  - If location features are turned on and permissions granted, the app may access approximate/precise location for “attach place” / location-based prompts.
  - Disclosure should match actual behavior: best-effort location access; user control via OS.
- **Calendar data (export)**:
  - `.ics` content includes activity title and optional description (may include goal title/notes); exported via share sheet under user control.

#### 2.3 Purposes of processing
List purposes such as:
- Provide core app functionality (store/display your workspace locally).
- Provide shared goals (invites, memberships, member roster).
- Provide AI features (generate suggestions, summarize context, improve coaching flow).
- Enforce quotas, prevent abuse, and secure services.
- Process payments and manage subscriptions (RevenueCat / Apple).
- Measure product performance and reliability (analytics; notification open metrics).

#### 2.4 Third-party processors/subprocessors (must name them)
Privacy Policy must name and describe (as applicable to the build):
- **Supabase** (Auth, Edge Functions, database, storage) — used for sign-in, shared goals, AI proxy, attachments.
- **LLM provider(s) via the AI proxy** (e.g., OpenAI) — processes user prompts and context to generate responses.
- **PostHog** — analytics event collection.
- **RevenueCat** — subscription and entitlement management; Apple handles payments.
- **Unsplash** — image search (Arc banners) when enabled; requests include the user’s search query and device network metadata.
- **GIPHY** — celebration GIF search when enabled; requests include search queries derived from app context (not free-form user text).

Also include:
- A statement that app stores (Apple App Store / Google Play) may collect data independently.

#### 2.5 AI-specific privacy disclosures (high priority)
Because Kwilt processes intimate “life planning” content, the Privacy Policy should explicitly disclose:
- **What is sent to AI**:
  - User messages/prompts, relevant workspace context (arcs/goals/activities summaries), and profile summaries used for personalization.
- **Where it goes**:
  - From device → AI proxy (Supabase Edge Function) → LLM provider(s).
- **Why**:
  - To generate responses, summaries, drafts, suggestions.
- **Retention**:
  - Whether the proxy stores request metadata/telemetry (counts, timestamps, status, latency) and for how long.
  - Whether prompts/responses are logged, and if so, how they’re protected and how long retained.
- **User choice**:
  - How to avoid sending data to AI (don’t use AI features; provide an in-app toggle if planned).

#### 2.6 Sharing disclosures (shared goals + attachments)
Privacy Policy must be extremely clear about:
- **Default sharing model** (“signals-only”).
- **What becomes visible to other members** when you join a shared goal.
- **What becomes visible if you enable specific sharing toggles** (e.g., attachments shared with goal members).
- **Your responsibility** when sharing content and links.

#### 2.7 Analytics: minimization + redaction commitments
Kwilt uses analytics but should commit to data minimization:
- State that Kwilt **does not intentionally send user-entered free-form text** to analytics.
- Describe the kinds of identifiers collected (install ID or analytics distinct ID), and whether it is used for personalized advertising (should be **no**, unless added later).
- Provide user controls where possible (opt-out toggle; or document the current state and roadmap).

#### 2.8 Legal bases (if applicable) and regional rights
Depending on target regions, include:
- GDPR/UK GDPR legal bases (contract, legitimate interests, consent where needed).
- CCPA/CPRA “sale/share” statement (likely **no sale/share**; confirm).
- Data subject rights: access, deletion, correction, portability, objection/opt-out.

#### 2.9 Data retention + deletion
Policy must cover:
- **On-device**: how users can delete local data (delete app; “Erase local data” if present).
- **Account data**: how users request account deletion (and what happens to shared-goal memberships).
- **Attachments**: how to delete uploaded attachments (and retention windows/backups).
- **Analytics**: retention window in PostHog.
- **AI proxy telemetry**: retention window.

#### 2.10 Security
Disclose:
- Encryption in transit (HTTPS).
- Authentication/authorization for shared goals and attachments.
- Best-effort posture; no method is 100% secure.

#### 2.11 Contact + updates
- Provide a support contact email and policy update process.

---

### 3) App Store / platform-facing disclosures (must align)

#### 3.1 iOS App Privacy “nutrition label”
Ensure Apple privacy declarations align with the Privacy Policy for:
- Contact info (email) if collected via sign-in.
- User content (goals/notes/attachments) if transmitted off-device.
- Identifiers (install ID / analytics ID).
- Usage data (analytics).
- Purchases (subscriptions).
- Location (if requested).

#### 3.2 Permissions rationale strings (in-app + OS prompts)
Kwilt should provide clear rationale text for:
- **Notifications**: reminders/nudges.
- **Photo library**: add attachments.
- **Microphone**: record audio attachments.
- **Location** (if enabled): attach a place and create location-based completion offers; not continuous tracking.
- **Calendar** (if the app requests calendar permissions): explain why (optional; `.ics` export may not require permission).

---

### 4) Implementation checklist for counsel + engineering

- **ToS**:
  - Service description; eligibility; accounts.
  - AI disclaimers + acceptable use + quotas/suspension.
  - Shared goals: signals-only default; invite link responsibility; member conduct.
  - Attachments: ownership/license; sharing controls; takedowns.
  - Subscriptions: Apple/RevenueCat terms; cancellation; restore; trial terms.
  - Liability/disclaimers/termination.

- **Privacy Policy**:
  - Local-first vs cloud processing explanation.
  - Data categories (including sensitive UGC + attachments).
  - Third-party processors list (Supabase, PostHog, RevenueCat, LLM provider, Unsplash, GIPHY).
  - AI-specific disclosures (what is sent, retention, user choice).
  - Sharing disclosures (shared goals + attachment sharing toggle).
  - Retention/deletion procedures.
  - Regional rights + contact.


