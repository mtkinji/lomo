# Leafling Evolution Vocabulary 01

## Identity spine

All forms preserve Leafling's cream face, amber eyes, leaf ears, green-and-gold palette, four-paw grounding, and cat-like curl. Form changes must alter silhouette and maturity without replacing the character.

## Atlas contract

- Runtime atlas: `public/leafling-stage-atlas-v1.png`
- Cell: 128 × 128 pixels
- Layout: eight columns × two rows
- Row 0: baby vocabulary
- Row 1: guardian vocabulary
- Ground anchor: `(64, 120)` in every cell
- Runtime sizes: baby 38 × 38, young 46 × 46, guardian 62 × 62

## Vocabulary columns

1. Neutral planted hold
2. Inhale / subtle life
3. Eye-only closed blink
4. Curious attention
5. Joy / greeting accent
6. Nuzzle / lowering key
7. Curl transition
8. Cat-like sleeping curl

The engine recomposes these keys into semantic clips with holds, accents, contact states, lift, and recovery. It does not interpolate every drawing at equal duration.
