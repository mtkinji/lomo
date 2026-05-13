# App Review Reply - Submission a6ab4d24

Submission ID: a6ab4d24-38d3-48f4-b5f2-8d53f8bffcbf  
Review date: May 12, 2026  
Version reviewed: 1.0 (56)

Hello,

Thank you for the review notes. We have addressed the items called out in the review and will submit a new build.

## Guideline 2.1(b) - In-App Purchase

We reviewed the subscription setup and will verify the Paid Apps Agreement, App Store Connect subscription product state, and RevenueCat offering before resubmitting. The new build also improves the in-app purchase error state when subscription packages are unavailable, so the app does not show a vague purchase error.

## Guideline 2.5.4 - Background Location

We removed `location` from `UIBackgroundModes`.

Kwilt uses region monitoring/geofences for optional location-based to-do offers. It does not use persistent real-time background location updates.

## Guideline 2.5.4 - Background Audio

Kwilt does have a background-audio feature: Focus mode soundscapes. These are bundled audio loops that can continue while the device is locked during a focus session.

To locate and test the feature:

1. Open Kwilt.
2. Open any to-do, or create a new to-do and open its detail page.
3. Tap `Focus`.
4. Start a Focus session with soundscape audio enabled.
5. Lock the device or send the app to the background.

Expected result: the selected Focus soundscape continues playing while the app is backgrounded or the screen is locked.

## Guideline 3.1.1 - Redeem Code

We removed the in-app `Redeem Pro code` path from the iOS app. Pro subscription access is now presented through the App Store in-app purchase flow.

## Guideline 5.1.1(ii) - Purpose Strings

We updated the camera and photo library purpose strings to clearly explain how Kwilt uses each permission, including concrete examples:

- Camera: taking a photo to attach to a to-do.
- Photo library: attaching images to a to-do or choosing an Arc/Goal hero image.

Thank you.
