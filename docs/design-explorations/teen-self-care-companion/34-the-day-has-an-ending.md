# Study 30 — The day has an ending

## Frame

- Audience: teens building self-directed patterns, with Maya as the lead persona and Charlie as the younger edge case.
- Hero job: help me make a small healthy choice feel meaningful enough that I want to return tomorrow.
- Underserved moment: after care is recorded, the world has acknowledged the action but has not emotionally completed the day.
- User voice: “I want the little world to exhale and close the day, so progress feels lived rather than recorded.”
- Design challenge: how might one completed Kwilt day become a short, believable evening without turning Moss into a need, a penalty, or another status surface?

## Constraint posture

Extend the portable engine with one renderer-neutral daylight state. Preserve the existing one-care-per-day rhythm, voluntary rest, durable life echoes, and the rule that nothing is lost overnight.

## Divergence

1. Change only the dock copy to say evening. Fast, but the world and the claim would disagree.
2. Cut instantly from day to night. Clear and inexpensive, but it feels like a mode switch rather than a living place.
3. Direct a continuous golden-hour → dusk → old-tree curl → moonlit-night sequence. Chosen because light, locomotion, animation, camera, and the next-morning affordance all tell the same story.

## Chosen system

The world owns five portable daylight phases: `day`, `golden`, `dusk`, `night`, and `dawn`. Care starts evening and gives Moss one authored destination: the old tree. Moss walks there on the terrain, plays the existing curled sleep vocabulary, and settles into a persistent night rest. The next-morning action appears only after both the sky is night and Moss is fully curled. Morning begins with dawn, a greeting, and a restored sunny world.

The renderer interprets those phases with a warm horizon, indigo dusk, restrained moon and stars, and a few firefly-like points. Other renderers can interpret the same state differently without changing behavior.

## Reductive decisions

- No clock, season, calendar, forecast, bedtime chooser, or time-of-day meter.
- No sleep need, health loss, streak punishment, or consequence for leaving.
- No modal cutscene and no reward currency.
- Evening temporarily owns Moss’s direction so a stray tap cannot break the walk or make the curl float away from the tree.
- The engine inspector exposes daylight state for QA; the capability itself remains the meadow.

## Learning release

Private Study 30 should prove on a phone-sized viewport that one complete To-do, Focus, or Play day flows through care, golden light, grounded travel, a real curl, night, and dawn. Browser proof remains prototype proof, not Kwilt integration proof.
