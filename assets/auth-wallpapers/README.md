## Auth wallpapers (Sign-in / Welcome)

This folder is reserved for **hand-picked background images** used **exclusively** on the
auth/sign-in interstitial (`SignInInterstitial`).

### How to add/curate
- Add PNG/JPG files to this folder (prefer large images, e.g. 1500px+ on the short edge).
- Keep them “wallpaper-like” (they will be rendered with `resizeMode="cover"`).
- Then update the list in `src/assets/authSignInWallpapers.ts` to include the new files via `require()`.

### Why this exists
We keep auth wallpapers separate to avoid accidental mixing with:
- Arc banners (used for arcs/goals/activity covers)
- Activity header fallback art
- Illustration assets used for empty states and other UI


