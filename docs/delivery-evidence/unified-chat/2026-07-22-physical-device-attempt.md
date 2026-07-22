# Physical-device proof attempt — 2026-07-22

- App version: `1.0.89`.
- App base SHA: `bf0500189807f97c3f2effcdd4d39bcfbc37af0d` with the Unified Chat implementation still uncommitted in its isolated worktree.
- Device class: paired iPhone 16.
- Intended build: signed Debug development-client build with Unified Chat enabled.

Observed:

- the device became available and paired through CoreDevice;
- Xcode selected the physical-device destination and automatic signing team;
- the build compiled and linked the app plus `ExpoDocumentPicker` and reached the Embed Pods Frameworks signing phase;
- compilation reported zero errors and four existing warnings before framework signing;
- signing `React.framework` failed with `errSecInternalComponent` because the macOS login keychain was unavailable while the Mac was locked;
- no binary from this attempt was installed or exercised on the phone.

This is blocker evidence, not physical-device product proof. It must not be used as a `proof.physical_device` reference or to raise any delivery score. Unlocking the Mac/keychain and rerunning the signed build is required before the physical interaction matrix can begin.
