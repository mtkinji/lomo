# App Review Reply - Submission a6ab4d24

## Latest Rejection - May 29, 2026 - Build 64

Submission ID: a6ab4d24-38d3-48f4-b5f2-8d53f8bffcbf
Review date: May 29, 2026
Review device: iPhone 17 Pro Max
Version reviewed: 1.0 (64)

### Before Resubmitting

- Ship a new binary with in-app account deletion exposed from Settings.
- Deploy the `account-delete` Supabase Edge Function.
- Verify deletion on a physical iPhone with a newly-created or demo account.
- Attach a screen recording in App Review Information > Notes that shows:
  - sign-in or account creation,
  - Settings > Account settings > Delete account,
  - the Apple subscription warning and Manage subscription option,
  - both confirmation prompts,
  - final account-deleted confirmation.

### Paste-Ready Reply

Hello,

Thank you for the review note. We have updated Kwilt to support in-app account deletion.

In the updated build, signed-in users can delete their account directly in the app:

1. Open Kwilt and sign in.
2. Open Settings.
3. Tap Account settings.
4. Tap Delete account.
5. Review the warning that account deletion does not cancel any Apple-managed subscription. The user can tap Manage subscription to open Apple's subscription management, or continue with account deletion.
6. Confirm the deletion prompts.
7. Kwilt permanently deletes the signed-in Supabase Auth user and user-owned cloud data, then clears the local signed-in state.

No customer service contact, email request, or external website is required to complete account deletion. Apple-managed subscription cancellation remains handled by Apple separately from account deletion. We will include a physical-device screen recording of the complete flow in the App Review Information Notes field for the next submission.

Thank you.

---

Submission ID: a6ab4d24-38d3-48f4-b5f2-8d53f8bffcbf
Review date: May 14, 2026
Review device: iPad Air 11-inch (M3), iPadOS 26.5
Version reviewed: 1.0 (57)

## Before Resubmitting

- Confirm the Paid Apps Agreement is active in App Store Connect.
- Confirm the App Store Connect subscription products are complete and submitted for review with review screenshots.
- Confirm the RevenueCat current offering includes the same product IDs used by the app:
  - `pro_monthly`
  - `pro_annual`
  - `pro_family_monthly`
  - `pro_family_annual`
- Sandbox-test a purchase from the submitted build path.
- Upload and attach a new binary after the IAP products are submitted.

Hello,

Thank you for the review notes. We have reviewed the in-app purchase configuration and the background audio feature location. We will submit the in-app purchase products for review with the required screenshots and upload a new binary before resubmitting.

## Guideline 2.1(b) - In-App Purchase Products

The app references Kwilt Pro subscription plans. We will make sure the associated in-app purchase products are complete and submitted for review in App Store Connect, including the required App Review screenshots, before resubmitting the app binary.

The subscription product identifiers used by the app are:

- `pro_monthly`
- `pro_annual`
- `pro_family_monthly`
- `pro_family_annual`

We will also confirm the Paid Apps Agreement is active and verify that the same product identifiers are available in the app's RevenueCat offering.

## Guideline 2.1(b) - In-App Purchase Error

We will retest the purchase flow in the sandbox after the App Store Connect subscription products are complete and submitted for review. The app's purchase flow depends on those products being available through the configured subscription offering, so we are checking both the App Store Connect product state and the RevenueCat offering configuration before resubmitting.

## Guideline 2.5.4 - Background Audio

Kwilt does have a background-audio feature: Focus mode soundscapes. These are bundled audio loops that can continue while the device is locked during a focus session.

To locate and test the feature:

1. Open Kwilt.
2. Open any to-do, or create a new to-do and open its detail page.
3. Tap `Focus`.
4. Start a Focus session.
5. Tap the sound icon in the Focus controls if soundscape audio is not already enabled.
6. Lock the device or send the app to the background.

Expected result: the selected Focus soundscape continues playing while the app is backgrounded or the screen is locked.

Thank you.
