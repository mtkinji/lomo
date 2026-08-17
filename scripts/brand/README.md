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

The mobile app tile is intentionally distinct from the standalone mark: it uses
a white opaque square with the solid pine K2 centered at 640 units within the
1024-unit canvas. Platform launcher masks supply the final corner treatment.
On iOS, `assets/icon-composer/AppIcon.icon` is the production source: a separate
white background and pine K2 vector layer, with Icon Composer glass, specular,
blur, translucency, and shadow effects disabled. The PNG remains the Android
launcher source and a deterministic raster fallback.

Run the integrity check after generation:

```bash
python3 scripts/brand/verify-k2-assets.py
```

The logo that K2 replaced is retained under
`assets/archive/pre-k2-2026-08-13/`. Matching dated archives live in the two
companion repositories.
