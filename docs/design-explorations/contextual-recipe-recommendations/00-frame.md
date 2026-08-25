# Frame: Contextual Recipe Recommendations

## What the user said

At 9:12 a.m., assume breakfast has already happened. Recommend lunch and dinner,
with dinner weighted more heavily because that is what most people plan.

## Restated in user voice

When I ask Kwilt what we might eat next, help me see meals that fit the part of
the day I am actually planning for, so I do not have to mentally discard the
same irrelevant breakfast ideas every time.

## Target audience

`audience-aspirational-family-organizers` — family organizers who want less
meal-decision work without maintaining a planning system.

## Representative persona

Maya is trying to settle a plausible short list between ordinary interruptions.
Repeatedly seeing breakfast after breakfast makes Kwilt feel static rather than
helpful. A tunable recommendation dashboard would feel like more work.

## Hero anchor

`jtbd-move-the-few-things-that-matter`

## Job flow step

Step 7, **Prepare a plausible short list**, is currently 2/5. Kwilt has a
Recommended shelf and can add its top choices to Ideas, but its ordering does
not yet reflect the current meal horizon.

## Active anchors

- `jtbd-move-the-few-things-that-matter` — reduce the work between “what should
  we eat?” and a usable short list.
- `jtbd-trust-this-app-with-my-life` — recommendations should use explainable
  context and avoid pretending to know facts Kwilt does not have.

## serves snippet

`serves: [jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]`

## System alignment

Constraint posture: `Fit the system`

- Existing surface: Recommended in Recipes and **Get ideas from Kwilt** in Plan.
- Existing model: editorial meal categories, favorites, featured status, and
  elapsed time already feed one shared recommendation selector.
- Existing convention: one material reason per recommendation; no invented
  pantry, household-preference, or budget knowledge.
- Constraint to preserve: recommendation order remains stable during one screen
  session and deliberate browsing remains available.

Design implication: capture local time once per Recipes session, use meal role
as a deterministic eligibility and ordering input, and keep all ranking inside
the existing shared selector.

## Aspirational design challenge

How might we help Maya get a plausible next-meal short list immediately, while
preserving explainable ranking and a calm cookbook she can still browse freely?

## Out of scope

Pantry inference, weather, budget fit, learned taste scores, calendar scheduling,
and a user-facing recommendation-settings screen.
