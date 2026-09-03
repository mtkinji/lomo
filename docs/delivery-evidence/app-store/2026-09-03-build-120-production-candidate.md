# Kwilt 1.0.120 production candidate — September 3, 2026

## Build provenance

- Source checkout: `/Users/andrewwatanabe/Kwilt`, branch `main`.
- Source commit: `1122c02d9e8628285d86f4faf9010a47da2a8d31`, pushed to
  `origin/main` before upload.
- EAS profile: `production-widgets`.
- App environment: `production`.
- EAS build: `0f6e49ea-c8b3-4188-af64-d90540dda71a`.
- Version/build: `1.0.120 (120)`.
- Bundle identifier: `com.andrewwatanabe.kwilt`.
- EAS fingerprint: `0c636a9490eb03540e181f5151b1958c59b18477`.
- EAS build result: `FINISHED` at `2026-09-03T23:27:58Z`.
- App Store Connect submission transport:
  `ddb2f523-1dbd-47aa-bd71-aae28757727e`, `FINISHED` at
  `2026-09-03T23:30:47Z`.
- EAS build page:
  <https://expo.dev/accounts/kwilt/projects/kwilt/builds/0f6e49ea-c8b3-4188-af64-d90540dda71a>.

The first launch attempt stopped before source upload when EAS tried to patch
the already-registered widget App Group and Apple rejected the capability-sync
request. That incomplete EAS record was canceled. Builds 117–119 established
that the same identifiers and signing profiles were already valid; the final
build therefore used `EXPO_NO_CAPABILITY_SYNC=1` and reused the active remote
profiles rather than modifying capabilities.

## Signed IPA inspection

- Downloaded IPA SHA-256:
  `9275d9e8dc10dc34d12bd56e105e56c56b93853a1c2032012ea7bfeb9cc2558a`.
- `codesign --verify --deep --strict` passed for the main app; each bundled
  extension also satisfied its designated requirement.
- Main app identity read from the IPA: `com.andrewwatanabe.kwilt`,
  `1.0.120 (120)`.
- Main app entitlements include production App Group
  `group.com.andrewwatanabe.kwilt`, Family Controls, and HealthKit.
- Bundled extensions:
  - `com.andrewwatanabe.kwilt.widgets`
  - `com.andrewwatanabe.kwilt.shield-configuration`
  - `com.andrewwatanabe.kwilt.shield-action`
  - `com.andrewwatanabe.kwilt.device-activity-monitor`

## Privacy-manifest inspection

- Archived app manifest SHA-256:
  `71ab106872538678d86605fe662ba3af213c80dd861a6edc370a6e7ad9a134ad`.
- The signed IPA's app-owned `PrivacyInfo.xcprivacy` contains all 22
  current-candidate collected-data declarations.
- `NSPrivacyTracking` is false and `NSPrivacyTrackingDomains` is empty.
- Required-reason entries remain present for file timestamps, UserDefaults,
  system boot time, and disk space.
- The only incorporated manifests declaring collected data are unchanged from
  the diagnostic Xcode report: LinkKit declares User ID, react-native-maps
  declares Precise Location, and RevenueCat declares Purchase History.

This signed-IPA inspection verifies the exact uploaded artifact's embedded
manifests and signature metadata. Xcode's visual aggregated privacy report was
previously generated from a local Release archive and showed the same app/SDK
declaration set, but EAS exposes the signed candidate as an IPA rather than an
`.xcarchive`; this record does not mislabel the IPA inspection as a newly
generated Xcode report from the remote archive.

## Apple processing and remaining UI checks

- Apple subsequently surfaced `1.0.120 (120)` in TestFlight. EAS status reports
  it in internal beta testing and ready for external beta submission, with
  fingerprint `0c636a9490eb03540e181f5151b1958c59b18477`.
- The processed TestFlight status mapped the upload to EAS build
  `11b755ed-cf6c-4119-b920-e30e2ff4da29` and submission
  `69b40bc6-cf45-4898-a516-10a376a90581`; the source-artifact build and
  transport identifiers above remain the provenance for the inspected IPA.
- All available browser profiles redirected to Apple sign-in, so the processed
  candidate's aggregate privacy preview and Privacy Choices URL were not
  rechecked in this pass.
- No version was submitted for App Review.
