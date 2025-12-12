## Kwilt onboarding cycle (Arc → Goal → Activities → Sharing)

### Goals
- **Minimum value (<3 min)**: user creates **1 Arc + 1 Goal + 1–3 Activities**.
- **Evangelism (<5 min)**: user completes minimum value and hits a **lightweight share/invite prompt** for social accountability.

### Non-negotiables (UX layers)
- **App shell stays intact**: primary navigation + margins remain the stable frame.
- **App canvas stays intact**: onboarding uses overlays/sheets inside the canvas; it never “replaces the app”.

### Current implementation strategy (locked)

#### 0) Native splash → in-app launch screen
- **Native splash**: static brand splash (`app.json`).
- **In-app launch screen**: `LaunchScreen` displays a short branded transition between native splash and the main shell.

#### 1) 3-step intro interstitials (explicit progression)
Host: `FirstTimeUxFlow`
- **Step 1/3 – Welcome**: set expectation + promise.
- **Step 2/3 – Notifications (optional)**: request permission with rationale; **skip supported**.
- **Step 3/3 – Path**: tell them what’s next + “Let’s begin”.

#### 2) FTUE survey in Agent workspace (identity Arc)
Host: `AgentWorkspace` → `IdentityAspirationFlow`
- **Tap-first questions (high-quality Arc foundation)**:
  domain → motivation → signature trait → growth edge → proud moment → meaning → impact → values → philosophy → vocation
- **Big dream (free response)**: one short “bring to life” prompt.
- **Nickname (optional)**: quick text or skip.
- **Generation**: synthesize Arc name + 3-sentence narrative + “next small step”.

#### 3) Handoff to core object creation (Goal → Activities)
Host: navigation + existing object canvases
- After Arc confirm:
  - route to `ArcDetail` with `openGoalCreation: true`
  - show first Arc celebration (non-blocking) then guide toward goal creation
- When the first onboarding goal is created:
  - tag it via `lastOnboardingGoalId`
  - route to `GoalDetail` (entryPoint: `arcsStack`)
  - show “first goal created” celebration with CTA to open Activities coach

#### 4) Social accountability + sharing (evangelism hook)
Host: `GoalDetailScreen`
- When onboarding goal’s Activities transition **0 → >0**, show a one-time share prompt:
  - **Invite a friend** (Share sheet)
  - **Not now** (dismiss)

### Measurement (recommended)
- **Time-to-minimum-value**: app open → first Activity created.
- **FTUE completion rate**: intro interstitials → Arc confirmed.
- **Goal adoption rate**: Arc confirmed → first goal created.
- **Activities adoption rate**: first goal created → first activity created.
- **Share conversion**: share prompt shown → share action completed (best-effort).

### Future enhancements (next iterations)
- Add a real **referral link/code** to the share payload.
- Add **account creation** after minimum value (or after share) to avoid front-loading friction.
- Add lightweight analytics hooks to `FirstTimeUxFlow` + onboarding presenters for clean funnel data.


