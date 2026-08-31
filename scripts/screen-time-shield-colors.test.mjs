import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createRequire } from 'node:module';

const generator = await readFile(new URL('../plugins/appleEcosystem/screenTimeShieldExtensions.js', import.meta.url), 'utf8');
const bridgeGenerator = await readFile(new URL('../plugins/withAppleEcosystemIntegrations.js', import.meta.url), 'utf8');
const require = createRequire(import.meta.url);
const { buildScreenTimeProtectionSwift } = require('../plugins/withAppleEcosystemIntegrations.js');
const { buildConfigurationSwift, infoPlist } = require('../plugins/appleEcosystem/screenTimeShieldExtensions.js');

test('every Kwilt shield renders solid parchment without a darkening blur', () => {
  assert.match(generator, /backgroundBlurStyle: nil,/);
  assert.doesNotMatch(generator, /backgroundBlurStyle: isMoney/);
});

test('every Kwilt shield uses parchment, dark text, and the standard Sumi primary action', () => {
  assert.match(generator, /private let parchment = UIColor\(red: 0\.980, green: 0\.969, blue: 0\.929, alpha: 1\.0\)/);
  assert.match(generator, /private let sumi = UIColor\(red: 0\.110, green: 0\.102, blue: 0\.098, alpha: 1\.0\)/);
  assert.match(generator, /backgroundColor: parchment,/);
  assert.match(generator, /title: ShieldConfiguration\.Label\(text: title, color: sumi\),/);
  assert.match(generator, /subtitle: ShieldConfiguration\.Label\(text: subtitle, color: detailColor\),/);
  assert.match(generator, /primaryButtonLabel: ShieldConfiguration\.Label\(text: KwiltShieldCopy\.buttonLabel\(for: reason\), color: UIColor\.white\),/);
  assert.match(generator, /primaryButtonBackgroundColor: sumi,/);
  assert.doesNotMatch(generator, /backgroundColor: pine,/);
  assert.doesNotMatch(generator, /quiltBlue|0\.106, green: 0\.157, blue: 0\.227/);
});

test('the shield builds one local Kwilt pause treatment from the blocked app name', () => {
  assert.match(generator, /private enum KwiltShieldArtwork/);
  assert.match(generator, /static func icon\(appName: String\) -> UIImage/);
  assert.match(generator, /let appPrefix = String\(trimmed\.prefix\(2\)\)/);
  assert.match(generator, /let monogram = String\(appPrefix\.prefix\(1\)\)\.uppercased\(\) \+ String\(appPrefix\.dropFirst\(\)\)\.lowercased\(\)/);
  assert.match(generator, /let blockedTile = CGRect\(x: 48, y: 38, width: 112, height: 112\)/);
  assert.match(generator, /context\.rotate\(by: -8 \* \.pi \/ 180\)/);
  assert.match(generator, /private static let parchment = UIColor\(red: 0\.980, green: 0\.969, blue: 0\.929, alpha: 1\.0\)/);
  assert.match(generator, /private static let parchmentDarker = UIColor\(red: 0\.965, green: 0\.902, blue: 0\.784, alpha: 1\.0\)/);
  assert.match(generator, /parchmentDarker\.setFill\(\)/);
  assert.match(generator, /\.foregroundColor: sumi/);
  assert.match(generator, /UIFont\(name: "Inter-Black", size: 42\)/);
  assert.match(generator, /x: blockedTile\.midX - monogramSize\.width \/ 2/);
  assert.doesNotMatch(generator, /visibleMonogramCenterX/);
  assert.match(generator, /offset: CGSize\(width: -3, height: 6\),\n        blur: 16,\n        color: UIColor\.black\.withAlphaComponent\(0\.28\)\.cgColor/);
  assert.match(generator, /UIImage\(named: "KwiltShieldAppIcon"\)/);
  assert.match(generator, /\.withTintColor\(pine, renderingMode: \.alwaysOriginal\)/);
  assert.doesNotMatch(generator, /UIBezierPath\(roundedRect: kwiltTile\.insetBy/);
  assert.match(generator, /icon: KwiltShieldArtwork\.icon\(appName: appName\)/);
  assert.match(generator, /UIColor\.black\.setFill\(\)/);
  assert.doesNotMatch(generator, /private static let coral/);
  assert.ok(generator.indexOf('parchmentDarker.setFill()') < generator.indexOf('let kwiltTile ='));
});

test('the shield extension bundles and declares the Inter font it uses', () => {
  assert.match(generator, /fonts: \['KwiltShieldInterBlack\.ttf'\]/);
  assert.match(generator, /node_modules\/@expo-google-fonts\/inter\/900Black\/Inter_900Black\.ttf/);
  const rendered = infoPlist({
    displayName: 'Test',
    extensionPointIdentifier: 'test.extension',
    principalClass: 'Test.Extension',
    fonts: ['KwiltShieldInterBlack.ttf'],
  });
  assert.match(rendered, /<key>UIAppFonts<\/key>/);
  assert.match(rendered, /<string>KwiltShieldInterBlack\.ttf<\/string>/);
});

test('shield actions preserve the reason for an exact in-app handoff', () => {
  assert.match(generator, /handoffRestrictionsKey = "kwilt_screen_time_handoff_restrictions_v2"/);
  assert.match(generator, /JSONEncoder\(\)\.encode\(restrictions\)/);
  assert.match(generator, /KwiltReviewRequest\.record\(restrictions:/);
});

test('native stores keep target-aware restriction entries instead of one last-writer reason', () => {
  assert.match(generator, /kwilt_screen_time_restriction_v2\./);
  assert.match(generator, /applicationTokenKeys/);
  assert.match(generator, /categoryTokenKeys/);
  assert.match(generator, /webDomainTokenKeys/);
  assert.match(generator, /let ruleId: String\?/);
  assert.match(generator, /let selectionId: String\?/);
  assert.match(generator, /let details: \[String\]\?/);
  assert.match(bridgeGenerator, /buildRestrictionLedgerSwift\('__KWILT_APP_GROUP_ID__'\)/);
  assert.match(bridgeGenerator, /KwiltRestrictionLedger\.upsert/);
  assert.match(bridgeGenerator, /KwiltRestrictionLedger\.remove/);
});

test('the JavaScript bridge receives semantic restriction identity without native tokens', () => {
  const rendered = buildScreenTimeProtectionSwift('group.test.kwilt');
  assert.match(rendered, /"restrictionId": entry\.id/);
  assert.match(rendered, /"ruleId": entry\.ruleId \?\? entry\.id/);
  assert.match(rendered, /"selectionId": entry\.selectionId \?\? entry\.id/);
  assert.doesNotMatch(rendered, /"applicationTokenKeys": entry\.applicationTokenKeys/);
  assert.match(rendered, /"details": entry\.details \?\? \[\]/);
});

test('a single composite shield explains the active conditions and retains the generic fallback', () => {
  const rendered = buildConfigurationSwift('group.test.kwilt');
  assert.match(rendered, /first\.reason == "personal_composite_rule"/);
  assert.match(rendered, /let details = first\.details \?\? \[\]/);
  assert.match(rendered, /title = "\\\(appName\) is paused\."/);
  assert.match(rendered, /more conditions also apply/);
  assert.match(rendered, /Open Kwilt to review what needs to change before using/);
});

test('the app bridge and extensions render the same concrete App Group', () => {
  const rendered = buildScreenTimeProtectionSwift('group.test.kwilt');
  assert.doesNotMatch(rendered, /__KWILT_APP_GROUP_ID__/);
  assert.equal(rendered.match(/group\.test\.kwilt/g)?.length, 2);
});

test('the generated Screen Time bridge can transfer an opaque picker selection between rule owners', () => {
  const rendered = buildScreenTimeProtectionSwift('group.test.kwilt');
  assert.match(rendered, /@objc\(transferActivitySelection:resolver:rejecter:\)/);
  assert.match(rendered, /sourceSelectionId/);
  assert.match(rendered, /targetSelectionId/);
  assert.match(rendered, /let sourceSelectionId = selectionIdentifier\(rawSourceSelectionId\)/);
  assert.match(rendered, /saveSelection\(sourceSelection, for: targetSelectionId\)/);
  assert.match(bridgeGenerator, /transferActivitySelection:\(NSString \*\)json/);
});

test('the shield and action extension resolve the same highest-priority matching reason', () => {
  assert.match(generator, /matchingRestrictions/);
  assert.match(generator, /priority\(for reason:/);
  assert.match(generator, /let reason = restrictions\.first\?\.reason/);
  assert.match(generator, /KwiltReviewRequest\.record\(restrictions: restrictions\)/);
  assert.match(generator, /buttonLabel\(for reason:/);
});
