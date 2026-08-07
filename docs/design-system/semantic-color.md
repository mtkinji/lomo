# Semantic Color

Color in Kwilt must carry meaning. It is not a finishing layer and it is not a
way to make a quiet surface feel more designed.

## The gate

Every non-neutral color on a product surface must have one named role:

1. **Brand identity** — reinforces Kwilt or a capability identity that has an
   established color contract.
2. **State** — communicates a reusable status such as success, warning, error,
   active, live, selected, or blocked.
3. **Action priority** — distinguishes the one primary or critical action when
   hierarchy cannot be carried clearly by placement, type, and shape alone.
4. **Reusable concept** — represents a specific idea, entity, or category with
   the same meaning everywhere that concept appears.

If a hue does not meet one of these roles, remove it. Use warm white, sumi,
muted text, borders, and neutral surfaces to provide structure without implying
meaning.

## Application rules

- **Kwilt green is reserved for brand moments.** `pine*`, the green `accent`
  roles, and green `success` must not be used for ordinary selection,
  completion, confirmation, status, navigation, or action priority. Those
  states should default to Sumi/neutral roles plus shape, iconography, or copy.
- A new intentional brand-green use must document its reason on the same source
  line with `@kwilt-brand-moment: <reason>`. Architecture lint compares product
  and UI code with `origin/main` and rejects any increase in unmarked green
  usage. Existing unmarked uses are legacy debt: they may stay flat or decrease,
  but they must not spread.
- Name the role before choosing the hue. “This screen needs an accent” is not a
  role.
- Use a semantic token or a documented local mapping. A raw palette token does
  not become meaningful merely because it exists.
- Keep the same concept mapped to the same color across surfaces. Do not reuse
  that color decoratively nearby.
- Do not replace a rejected accent with a different arbitrary hue. Re-evaluate
  whether color is needed at all.
- Do not use several hues to distinguish actions that are already clear from
  their label, icon, position, or containment.
- Neutrals are the structural baseline, not a substitute accent palette.
- Color cannot be the only carrier of state or meaning; pair it with copy,
  iconography, shape, or another accessible signal.

## Review questions

For each non-neutral color, ask:

- What exact meaning does this color carry here?
- Is that meaning one of the four allowed roles?
- Will the same meaning use the same color elsewhere?
- Would removing the hue make the state, idea, or action less clear?
- Is the meaning still available without color?

If the first three answers are not concrete, the color has not earned its
place.
