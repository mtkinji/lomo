# iOS simulator verification

Kwilt and Kwilt Money development clients can both reconnect to Metro on port `8081`. If the other app is still running, its stale bundle can send asset requests to the wrong project's Metro server. A request such as `/.%2Fassets%2Fauth-wallpapers` is evidence of that cross-app reconnect, not a Kwilt Money asset path.

For a clean Kwilt Money verification run:

1. List booted devices with `xcrun simctl list devices booted`.
2. For the simulator UUID being tested, stop both clients:
   - `xcrun simctl terminate <device-uuid> com.andrewwatanabe.kwilt`
   - `xcrun simctl terminate <device-uuid> app.kwilt.budget`
3. Start this repository with `npx expo start --dev-client --clear --localhost`.
4. Launch only `app.kwilt.budget` on the selected simulator.

For fixture-backed UI inspection, prefix the Metro command with `EXPO_PUBLIC_KWILT_BUDGET_SCREENSHOT_PREVIEW=1`.
