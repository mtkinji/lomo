# App Store Release Checklist - 1.0.57

Use this checklist before submitting the App Store rejection-fix build for submission `a6ab4d24-38d3-48f4-b5f2-8d53f8bffcbf`.

## App Store Connect

- [ ] Paid Apps Agreement is active in App Store Connect > Business.
- [ ] Kwilt Pro subscription products are complete and ready for review.
- [ ] The subscription products are included with the new app submission.
- [ ] App Review notes include the background-audio reproduction steps from `docs/app-store/app-review-reply-a6ab4d24.md`.
- [ ] App Review notes include a sandbox reviewer account if needed.

## RevenueCat

- [ ] The production iOS app API key is present in the EAS/App Store build environment.
- [ ] The current offering contains the intended Kwilt Pro packages.
- [ ] Product identifiers in RevenueCat match App Store Connect:
  - [ ] `pro_monthly`
  - [ ] `pro_annual`
  - [ ] `pro_family_monthly`
  - [ ] `pro_family_annual`
- [ ] RevenueCat dashboard shows no product-configuration warnings.

## Build Metadata

- [ ] Bump `version` in `app.config.ts` to `1.0.57`.
- [ ] Bump iOS `buildNumber` in `app.config.ts` to `57`.
- [ ] Bump Android `versionCode` only if producing an Android build from the same commit.

## Device Smoke Tests

- [ ] Settings no longer shows `Redeem Pro code`.
- [ ] Upgrade to Kwilt Pro opens the Apple purchase sheet in sandbox.
- [ ] If subscription packages are unavailable, the app shows the clearer fallback message instead of a vague package error.
- [ ] Focus mode soundscape continues after locking the device.
- [ ] Location-based to-do offers still register and send a local notification from a geofence event.
- [ ] Camera permission prompt explains attaching a photo to a to-do.
- [ ] Photo library permission prompt explains attachments and Arc/Goal hero images.

## Generated iOS Config Check

After prebuild or EAS config generation, verify the generated `Info.plist`:

- [ ] `UIBackgroundModes` contains `audio`.
- [ ] `UIBackgroundModes` does not contain `location`.
- [ ] `NSCameraUsageDescription` contains the new camera example.
- [ ] `NSPhotoLibraryUsageDescription` contains the new photo-library example.
