# Converge: Dynamic Next Best Action

## Scoring

- Rule-Based Primary Action: best fit for scope, trust, and verification. It solves the immediate choice problem without pretending to be smarter than the app can currently be.
- AI First Suggestion: promising later, but too opaque and network-dependent for the first version.
- User-Trained Favorite Action: valuable future layer, but premature before the baseline action surface exists.
- Two-Part "Do / Shape" Control: workable, but it reintroduces a mini capability taxonomy.

## Chosen alternative

Ship Option A: Rule-Based Primary Action.

The Activity Detail bottom dock keeps the existing floating-shell language, but the left side becomes one labeled recommendation with a chevron menu. Tapping the label side performs the recommended action. Tapping the chevron opens the same discoverable alternatives: Focus, Schedule, Add steps, Ask Kwilt, and Share. Completion remains the exclusive domain of the circular button on the right.

## Accepted trade-offs

- The first recommendation engine is intentionally simple.
- The menu is less instantly scannable than four always-visible icons, but it reduces default choice pressure.
- "Add steps" focuses the existing inline step entry row rather than opening the AI assistant.

## Rejected trade-offs

- Do not make AI the primary engine before it can be explained and verified.
- Do not add a dashboard or recommendation rationale panel.
- Do not hide secondary actions completely.

## Stated bet

We're betting that a calm rule-based recommendation will make the Activity Detail screen feel more useful than a capability toolbar. If it turns out not to be true, we'd revisit by adding lightweight explanation and usage-informed ranking before adding a fully AI-generated recommender.

## Success signal

Users can move from opening an Activity to taking one meaningful action with one tap, while still finding schedule, focus, AI help, and share from the menu.
