## Auth wallpapers (Sign-in / Welcome + Covers)

This folder contains **hand-picked background images** used on the auth/sign-in
interstitial (`SignInInterstitial`) and mixed into the shared cover/banner image library.

### How to add/curate
- Add PNG/JPG files to this folder (prefer large images, e.g. 1500px+ on the short edge).
- Keep them “wallpaper-like” (they will be rendered with `resizeMode="cover"`).
- Then update the list in `src/assets/authSignInWallpapers.ts` to include the new files via `require()`.

### Why this exists
These images started as auth wallpapers, but they are intentionally available as:
- Sign-in / welcome backgrounds
- Arc, Goal, and To-do cover images

Keep them separate from illustration assets used for empty states and other UI.

