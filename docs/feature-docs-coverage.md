# Feature Briefs To Public Docs Coverage

This map keeps the internal feature-brief layer and the public docs layer aligned. It is intentionally a working product artifact, not customer-facing copy.

## Translation Rule

- `FEATURE.md` explains what a feature folder currently serves.
- `docs/feature-briefs/<slug>.md` explains a time-bounded product decision or shipped capability.
- `kwilt-site` `/docs` articles translate one or more briefs into customer-safe help content.
- Public docs should group by user job or surface. Do not create a separate public article for every internal feature if that would fragment the help experience.

## Coverage Matrix

| Feature | Customer-visible surface | Existing brief coverage | Coverage gap | Public docs target |
| --- | --- | --- | --- | --- |
| `account` | Settings, profile, subscriptions, destinations, notifications, sharing, AI controls | `ai-proxy-and-quotas`, `external-ai-connector`, `monetization-paywall-revenuecat`, `social-goals-auth` | Add notification provenance through `notifications-v1-5` | Account, billing, privacy, notifications, AI help |
| `activities` | Activities list, quick add, detail, views, activity search | `auto-schedule`, `calendar-export-ics`, `geolocation-activity-offers`, `kwilt-text-coach` | Add keyboard/input safety provenance for input-heavy activity surfaces | Activities |
| `ai` | AI chat, agent workspace, workflows, share intake | `ai-proxy-and-quotas`, `external-ai-connector` | Add keyboard/input safety provenance for chat composer | AI help |
| `arcs` | Arc inventory, Arc creation, Arc detail, Goal detail in Arc context | `arc-goal-lifecycle-and-limits`, `desktop-app` | Covered for v1 docs | Arcs |
| `chapters` | Chapters list/detail, align flow, digest settings | none | Needs a shipped feature brief for retrospective sensemaking | Chapters |
| `friends` | Friends and private accountability | `social-dynamics-evolution`, `social-goals-auth` | Covered for v1 docs; can roll into Goals or Account privacy | Goals, sharing, privacy |
| `goals` | Goals list, creation, sharing, join flow, check-ins | `arc-goal-lifecycle-and-limits`, `growth-evangelism-shared-goals`, `social-goals-auth`, `social-dynamics-evolution` | Add keyboard/input safety provenance for input-heavy goal surfaces | Goals |
| `home` | Today/home canvas | none | Needs a shipped feature brief for daily orientation | Getting started, Today |
| `more` | Secondary navigation and overflow | none | Low priority; shell-adjacent, not a public-doc article | None for v1 |
| `onboarding` | First-run identity flow, launch/config states, interstitials | `ai-proxy-and-quotas`, `growth-evangelism-shared-goals` | Covered enough for v1 docs through Arcs/getting started | Getting started |
| `paywall` | Upgrade drawer and interstitial | `ai-proxy-and-quotas`, `monetization-paywall-revenuecat` | Covered for v1 docs | Account, billing, AI help |
| `plan` | Planning canvas, calendar lens, schedule apply, availability/calendar settings, recap | `auto-schedule`, `background-agents-weekly-planning`, `calendar-export-ics`, `desktop-app` | Add notification provenance if reminders/nudges route into planning | Planning and calendar |
| `search` | Global search drawer and ranking | none | Needs a shipped feature brief for local findability | Search |

## First-Pass Brief Work

Write or link these before expanding public docs:

1. Create `chapters-retrospective-sensemaking.md`.
2. Create `home-today-orientation.md`.
3. Create `global-search-findability.md`.
4. Link `notifications-v1-5` into `account` and `plan` manifests.
5. Link `keyboard-input-safety` into `activities`, `ai`, and `goals` manifests.

## First-Pass Public Docs

The first docs expansion should cover:

- Arcs
- Goals
- Activities
- Planning and calendar
- AI help
- Account, billing, and privacy
- Chapters
- Search

Each article should include `sourceBriefs` metadata in `kwilt-site/lib/docs.ts` so the public docs can be traced back to internal product truth without exposing internal ids on the page.
