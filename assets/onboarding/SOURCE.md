# Onboarding shoreline

Selected by Andrew on September 21, 2026. Copied unchanged into Kwilt on September 22.

- Creator: Ruvim M
- Source: https://www.pexels.com/video/top-view-of-beach-waves-crashing-on-seashore-4183071/
- License: https://www.pexels.com/license/ (recorded as checked September 21, 2026)
- Licensed stock, not public domain. Commercial use and editing permitted under the complete Pexels terms; attribution not required.
- `shoreline.mp4`: 720×1280, H.264, silent, 20.153 seconds. Constant centered crop of the original 2560×1440 footage. No generated, reversed or interpolated frames, no dissolves. No watermark visible in inspected frames.
- `shoreline-poster.jpg`: still fallback from the selected footage.
- `shoreline-smooth.mp4`: September 23 runtime derivative, 720×1280, H.264, silent, 30fps, 18 seconds. A two-second overlap dissolve joins the tail to the opening; the file starts at original t=2 so its wrap continues forward. No reversing or generated wave frames. Original `shoreline.mp4` is retained as the source, not bundled by the player.
- Natural drone drift remains. The smoothed version blends two wave phases near the end; it is an editorial dissolve, not physically continuous water simulation.
- Rebuild/check with `scripts/prepare-onboarding-shoreline.py` (Python, numpy and imageio-ffmpeg). Decoded grayscale mean absolute wrap difference / median neighboring-frame difference: original 13.93×; smoothed 1.34×. This catches an abrupt wrap, but visual acceptance of the dissolve remains a separate check.
- Original provenance and media: `/Users/andrewwatanabe/.codex/visualizations/2026/09/15/01a0a6bf-5ee1-7a72-8dae-a5e31f9bf0d3/SHORELINE-SOURCE.md`.
