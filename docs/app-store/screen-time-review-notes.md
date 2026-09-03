# Screen Time App Review notes

Use this draft in App Store Connect only after replacing build-specific details
with the exact submitted candidate and confirming every path on that build.

Kwilt offers a complete Free Screen Time baseline on the configured iPhone.
Free users can authorize Screen Time, choose apps or categories with Apple's
private picker, and create any number of simple unscheduled rules based on one
Focus or daily-use condition. They can inspect, edit, turn off, delete, release,
and clean up those rules without subscribing.

Kwilt Pro does not sell access to Apple's Screen Time APIs, additional selected
apps, additional minutes, stronger blocking, or Apple authorization. Pro adds
Kwilt-created automation and coordination: time-based schedules, combined
conditions, conditions connected to Kwilt Activities or Money, and managed
Household agreements with named-child binding, caregiver changes, delivery
receipts, requests, exceptions, and recovery.

## Free test path

1. Open **Settings → Screen Time**.
2. Choose **Continue**, then **Allow Screen Time**.
3. In Apple's private picker, select an app or category.
4. Add one **Focus** or **Daily use** condition and save the rule.
5. Return to **Settings → Screen Time** to edit, turn off, or delete the rule.

For an in-person child-device test on the child's iPhone, open the same screen
and choose **Set up for a child**. Complete Apple's guardian authorization and
create the same simple local rule. This path does not name a child in Kwilt,
bind the iPhone to a Kwilt Household, or enable remote caregiver changes.

## Pro test path

1. From the personal rule builder, choose **Time of day** or add a second
   condition. Kwilt explains that the schedule or combined rule is a Pro
   outcome before showing plan choice.
2. For managed coordination, open **Settings → Household**, choose a child,
   and open that child's Screen Time setup. The Pro path connects the exact
   child device and keeps desired-versus-applied delivery receipts distinct.

The app and Screen Time extensions require Apple's Family Controls distribution
entitlement. Record the exact entitlement-enabled build, reviewer account,
subscription product state, and physical-device results in the submission
ledger before pasting these notes into App Store Connect.
