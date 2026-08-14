# Kwilt K2 brand assets

`assets/logo.svg` is the production source of truth for the K2 mark. Its three
path contours and transforms match the approved `l2-clear-small-scale-air.svg`
small-scale refinement. The contours remain identical to the original K2; only
piece placement changed to preserve breathing room at 18–21 points.

Run the generator from the Kwilt repository root on macOS:

```bash
python3 scripts/brand/generate-k2-assets.py
```

The generator creates the app's raster and native-platform variants and updates
the corresponding assets in the sibling `kwilt-site` and `kwilt-desktop`
repositories. It requires Pillow plus the macOS `sips` and `iconutil` tools.

Run the integrity check after generation:

```bash
python3 scripts/brand/verify-k2-assets.py
```

The logo that K2 replaced is retained under
`assets/archive/pre-k2-2026-08-13/`. Matching dated archives live in the two
companion repositories.
