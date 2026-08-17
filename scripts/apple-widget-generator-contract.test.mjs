import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const widgetGenerator = await readFile(
  new URL('../plugins/withAppleEcosystemIntegrations.js', import.meta.url),
  'utf8',
);
const moneyWidgetTemplate = await readFile(
  new URL('../plugins/appleEcosystem/moneyWidgetSwift.js', import.meta.url),
  'utf8',
);
const focusWidgetTemplate = await readFile(
  new URL('../plugins/appleEcosystem/focusWidgetSwift.js', import.meta.url),
  'utf8',
);
const chatWidgetTemplate = await readFile(
  new URL('../plugins/appleEcosystem/chatWidgetSwift.js', import.meta.url),
  'utf8',
).catch(() => '');
const generatedWidgetSwift = await readFile(
  new URL('../ios/KwiltWidgets/KwiltWidgets.swift', import.meta.url),
  'utf8',
);

test('generated Money widgets include their currency formatting dependency', () => {
  assert.match(moneyWidgetTemplate, /formatCurrency\(cents:/);
  assert.match(widgetGenerator, /static let currency: NumberFormatter/);
  assert.match(widgetGenerator, /func formatCurrency\(cents: Double\?\) -> String\?/);
});

test('all widget families share the bundled Inter typography system', () => {
  assert.match(widgetGenerator, /enum KwiltWidgetTypography/);
  assert.match(widgetGenerator, /Inter-Medium/);
  assert.match(widgetGenerator, /Inter-SemiBold/);
  assert.match(widgetGenerator, /Inter-Black/);
  assert.match(widgetGenerator, /<key>UIAppFonts<\/key>/);

  for (const source of [moneyWidgetTemplate, focusWidgetTemplate, chatWidgetTemplate]) {
    assert.match(source, /KwiltWidgetTypography/);
  }
  assert.doesNotMatch(focusWidgetTemplate, /design: \.rounded/);
  assert.doesNotMatch(chatWidgetTemplate, /design: \.rounded/);
  assert.doesNotMatch(widgetGenerator, /design: \.rounded/);
});

test('launcher and To-dos widgets carry the Kwilt mark without redundant launcher labels', () => {
  const activitiesView = widgetGenerator.slice(
    widgetGenerator.indexOf('struct ActivitiesWidgetView'),
    widgetGenerator.indexOf('struct KwiltActivitiesWidget'),
  );
  const streakView = widgetGenerator.slice(
    widgetGenerator.indexOf('struct SmallHomeWidgetView'),
    widgetGenerator.indexOf('struct KwiltStreakWidget'),
  );
  const flexibleView = moneyWidgetTemplate.slice(
    moneyWidgetTemplate.indexOf('struct FlexibleMoneyAnswerCard'),
    moneyWidgetTemplate.indexOf('struct FlexibleMoneyWidgetView'),
  );
  const categoryView = moneyWidgetTemplate.slice(
    moneyWidgetTemplate.indexOf('struct MoneyCategoryWidgetView'),
    moneyWidgetTemplate.indexOf('struct KwiltMoneyCategoryWidget'),
  );

  for (const source of [streakView, focusWidgetTemplate, chatWidgetTemplate, flexibleView]) {
    assert.match(source, /kwiltLogoImage\(\)/);
  }
  assert.match(activitiesView, /kwiltLogoImage\(\)/);
  assert.doesNotMatch(focusWidgetTemplate, /Text\("Kwilt"\)/);
  assert.doesNotMatch(chatWidgetTemplate, /Text\("Kwilt"\)/);
  assert.doesNotMatch(categoryView, /kwiltLogoImage\(\)/);
});

test('generated Money widgets preserve the clock-style meter grammar', () => {
  assert.match(moneyWidgetTemplate, /ForEach\(0\.\.<moneyTickCount/);
  assert.match(moneyWidgetTemplate, /periodElapsedPercent:/);
  assert.match(moneyWidgetTemplate, /overBudgetTickWidth/);
  assert.match(moneyWidgetTemplate, /\.font\(KwiltWidgetTypography\.value\)/);
  assert.doesNotMatch(moneyWidgetTemplate, /StrokeStyle\([^\n]*dash:/);
});

test('Money widgets keep the category clock tile centered and give Flexible Money its own answer-card style', () => {
  const flexibleAnswerCard = moneyWidgetTemplate.slice(
    moneyWidgetTemplate.indexOf('struct FlexibleMoneyAnswerCard'),
    moneyWidgetTemplate.indexOf('struct FlexibleMoneyWidgetView'),
  );
  const flexibleView = moneyWidgetTemplate.slice(
    moneyWidgetTemplate.indexOf('struct FlexibleMoneyWidgetView'),
    moneyWidgetTemplate.indexOf('struct KwiltFlexibleMoneyWidget'),
  );
  const categoryView = moneyWidgetTemplate.slice(
    moneyWidgetTemplate.indexOf('struct MoneyCategoryWidgetView'),
    moneyWidgetTemplate.indexOf('struct KwiltMoneyCategoryWidget'),
  );

  assert.doesNotMatch(flexibleView, /MoneyTickBorder/);
  assert.match(flexibleView, /FlexibleMoneyAnswerCard/);
  assert.match(flexibleAnswerCard, /Text\("Flexible money"\)[\s\S]*?minimumScaleFactor\(0\.78\)/);
  assert.match(
    categoryView,
    /VStack\(spacing: 0\) \{[\s\S]*?Spacer\(minLength: 0\)[\s\S]*?VStack\(alignment: \.center, spacing: 4\)[\s\S]*?Text\(category\.name\)/,
  );
  assert.match(
    categoryView,
    /Text\(meaning\)[\s\S]*?frame\(maxWidth: \.infinity, alignment: \.center\)[\s\S]*?\}[\s\S]*?Spacer\(minLength: 0\)/,
  );
  assert.match(categoryView, /HStack\(spacing: 0\)[\s\S]*?Text\(category\.name\)[\s\S]*?Spacer\(minLength: 0\)/);
  assert.match(categoryView, /HStack\(alignment: \.top, spacing: 1\)/);
  assert.match(categoryView, /KwiltWidgetTypography\.currencySymbol/);
  assert.match(categoryView, /KwiltWidgetTypography\.categoryValue/);
  assert.match(
    categoryView,
    /if entry\.display == \.percentUsed \{[\s\S]*?HStack\(alignment: \.lastTextBaseline, spacing: 1\)[\s\S]*?Text\(percentValueText\)[\s\S]*?Text\("%"\)[\s\S]*?KwiltWidgetTypography\.currencySymbol/,
  );
  const percentValueBranch = categoryView.slice(
    categoryView.indexOf('if entry.display == .percentUsed'),
    categoryView.indexOf('} else {', categoryView.indexOf('if entry.display == .percentUsed')),
  );
  assert.doesNotMatch(percentValueBranch, /padding\(\.top/);
  assert.match(categoryView, /\.tracking\(-0\.7\)/);
  assert.match(categoryView, /category\.status == "over" \? MoneyWidgetPalette\.over : \.primary/);
  assert.doesNotMatch(categoryView, /moneyFreshnessLabel|Updated/);
});

test('Budget Category rounds dollars and compacts thousands before rendering', () => {
  assert.match(moneyWidgetTemplate, /func compactBudgetDollarText\(cents: Double\) -> String/);
  assert.match(moneyWidgetTemplate, /abs\(cents \/ 100\.0\)\.rounded\(\)/);
  assert.match(moneyWidgetTemplate, /roundedDollars >= 999_950/);
  assert.match(moneyWidgetTemplate, /roundedDollars >= 1_000/);
  assert.match(moneyWidgetTemplate, /compactBudgetNumber\(roundedDollars \/ 1_000\.0\) \+ "k"/);
  assert.doesNotMatch(moneyWidgetTemplate, /formatCurrency\(cents: abs\(category\.remainingCents/);
});

test('Budget Category transports the selected category as a persisted scalar id', () => {
  assert.match(moneyWidgetTemplate, /struct MoneyCategoryOptionsProvider: DynamicOptionsProvider/);
  assert.match(moneyWidgetTemplate, /IntentItem\([\s\S]*?category\.id,[\s\S]*?title: LocalizedStringResource/);
  assert.match(moneyWidgetTemplate, /@Parameter\(title: "Category", optionsProvider: MoneyCategoryOptionsProvider\(\)\)/);
  assert.match(moneyWidgetTemplate, /var categoryId: String\?/);
  assert.match(moneyWidgetTemplate, /let selectedId = configuration\.categoryId/);
  assert.doesNotMatch(moneyWidgetTemplate, /MoneyCategoryEntity/);
});

test('Budget Category transports its display choice without AppEnum', () => {
  assert.match(moneyWidgetTemplate, /struct MoneyCategoryDisplayOptionsProvider: DynamicOptionsProvider/);
  assert.match(moneyWidgetTemplate, /IntentItem\("Dollars left", title: "Dollars left"\)/);
  assert.match(moneyWidgetTemplate, /IntentItem\("Percent used", title: "Percent used"\)/);
  assert.match(moneyWidgetTemplate, /func defaultResult\(\) async -> String\?/);
  assert.match(moneyWidgetTemplate, /return "Dollars left"/);
  assert.match(moneyWidgetTemplate, /@Parameter\(title: "Show", optionsProvider: MoneyCategoryDisplayOptionsProvider\(\)\)/);
  assert.match(moneyWidgetTemplate, /var display: String\?/);
  assert.match(moneyWidgetTemplate, /func moneyCategoryDisplay\(from configuredValue: String\?\) -> MoneyCategoryDisplay/);
  assert.match(moneyWidgetTemplate, /case "Percent used", "percentUsed":/);
  assert.match(moneyWidgetTemplate, /moneyCategoryDisplay\(from: configuration\.display\)/);
  assert.doesNotMatch(moneyWidgetTemplate, /enum MoneyCategoryDisplay: String, AppEnum/);
});

test('generated Focus widget opens the in-app duration and audio decision moment', () => {
  assert.match(widgetGenerator, /getFocusWidgetSwift\(targetName\)/);
  assert.match(focusWidgetTemplate, /struct KwiltFocusWidget: Widget/);
  assert.match(focusWidgetTemplate, /StaticConfiguration\(/);
  assert.doesNotMatch(focusWidgetTemplate, /WidgetConfigurationIntent|AppIntentConfiguration/);
  assert.doesNotMatch(focusWidgetTemplate, /FocusDurationPreset/);
  assert.doesNotMatch(focusWidgetTemplate, /enum FocusAudioPreset: String, AppEnum/);
  assert.doesNotMatch(focusWidgetTemplate, /@Parameter\(title: "Audio"/);
  assert.match(widgetGenerator, /kwilt:\/\/focus\?source=widget/);
  assert.doesNotMatch(widgetGenerator, /today\?openStandaloneFocusSetup=1&source=widget/);
  assert.doesNotMatch(focusWidgetTemplate, /Surprise soundscape/);
  assert.doesNotMatch(focusWidgetTemplate, /Set your session/);
  assert.doesNotMatch(focusWidgetTemplate, /Text\("Kwilt"\)/);
  assert.match(focusWidgetTemplate, /Text\("Start a Focus session"\)/);
  assert.match(focusWidgetTemplate, /font\(KwiltWidgetTypography\.launcherTitle\)/);
  assert.match(focusWidgetTemplate, /Text\("Start"\)[\s\S]*?Image\(systemName: "arrow\.right"\)/);
  assert.match(focusWidgetTemplate, /Text\("Start"\)[\s\S]*?\.frame\(maxWidth: \.infinity, alignment: \.trailing\)/);
  assert.doesNotMatch(focusWidgetTemplate, /Text\("Open"\)/);
  assert.doesNotMatch(focusWidgetTemplate, /Choose time and audio/);
  assert.match(focusWidgetTemplate, /Text\(timerInterval: start\.\.\.end, countsDown: true\)/);
  assert.match(focusWidgetTemplate, /FocusWidgetEntry\(date: end, focusSession: nil\)/);
  assert.match(focusWidgetTemplate, /return FocusWidgetEntry\(/);
  assert.doesNotMatch(focusWidgetTemplate, /Unlinked session/);
  assert.match(widgetGenerator, /KwiltFocusWidget\(\)/);
});

test('generated Focus shortcuts fall back to the standalone Focus route', () => {
  assert.ok(widgetGenerator.includes('kwilt://today?autoStartStandaloneFocus=1&focusMinutes=\\\\(safeMinutes)&source=shortcut'));
  assert.match(widgetGenerator, /kwilt:\/\/today\?openStandaloneFocus=1&source=shortcut/);
});

test('generated Screen Time authorization handles the iOS 26 data-access state', () => {
  assert.match(widgetGenerator, /status\.rawValue == 3/);
  assert.doesNotMatch(widgetGenerator, /\.approvedWithDataAccess/);
  assert.match(widgetGenerator, /return "approved"/);
  assert.match(widgetGenerator, /resolve\(Self\.statusString\(\)\)/);
});

test('generated Focus Live Activity balances compact identity and time, then reveals the to-do', () => {
  for (const source of [widgetGenerator, generatedWidgetSwift]) {
    assert.match(source, /DynamicIslandExpandedRegion\(\.leading\)/);
    assert.match(source, /DynamicIslandExpandedRegion\(\.trailing\)/);
    assert.match(source, /DynamicIslandExpandedRegion\(\.bottom\)/);
    assert.match(source, /frame\(width: 20, height: 20\)/);
    assert.match(source, /frame\(width: 48, alignment: \.trailing\)/);
    assert.match(source, /font\(KwiltWidgetTypography\.compactTimer\)/);
    assert.match(source, /Text\(context\.state\.title\)/);
    assert.doesNotMatch(source, /marquee|scrolling/i);
  }
});

test('generated Chat widget is a private static fresh-entry launcher', () => {
  assert.match(widgetGenerator, /getChatWidgetSwift\(targetName\)/);
  assert.match(chatWidgetTemplate, /struct KwiltChatWidget: Widget/);
  assert.match(chatWidgetTemplate, /kwilt:\/\/chat\?entry=fresh&mode=conversation&source=widget/);
  assert.doesNotMatch(chatWidgetTemplate, /Text\("Kwilt"\)/);
  assert.match(chatWidgetTemplate, /Text\("Chat with Kwilt"\)/);
  assert.match(chatWidgetTemplate, /font\(KwiltWidgetTypography\.launcherTitle\)/);
  assert.match(chatWidgetTemplate, /Text\("Start"\)[\s\S]*?Image\(systemName: "arrow\.right"\)/);
  assert.match(chatWidgetTemplate, /Text\("Start"\)[\s\S]*?\.frame\(maxWidth: \.infinity, alignment: \.trailing\)/);
  assert.doesNotMatch(chatWidgetTemplate, /Text\("Open"\)/);
  assert.match(chatWidgetTemplate, /\.supportedFamilies\(\[\.systemSmall\]\)/);
  assert.doesNotMatch(chatWidgetTemplate, /thread|message|transcript|record/i);
  assert.match(widgetGenerator, /KwiltChatWidget\(\)/);
});

test('generated To-dos widget gives the ranked top three exact destinations', () => {
  const activitiesSource = widgetGenerator.slice(
    widgetGenerator.indexOf('struct ActivitiesEntry'),
    widgetGenerator.indexOf('${getFocusWidgetSwift(targetName)}'),
  );

  assert.match(activitiesSource, /state\?\.suggested\?\.items/);
  assert.doesNotMatch(activitiesSource, /state\?\.todaySummary\?\.top3/);
  assert.match(activitiesSource, /struct Row \{ let activityId: String; let title: String \}/);
  assert.match(activitiesSource, /prefix\(3\)\.map \{ ActivitiesEntry\.Row\(activityId: \$0\.activityId, title: \$0\.title\) \}/);
  assert.match(activitiesSource, /Text\("To-dos"\)/);
  assert.match(activitiesSource, /prefix\(3\)/);
  assert.match(activitiesSource, /deepLinkQuickAdd\(\)/);
  assert.match(activitiesSource, /Link\(destination: deepLinkToday\(\)!\)/);
  assert.match(activitiesSource, /Link\(destination: deepLinkActivity\(row\.activityId\)!\)/);
  assert.match(activitiesSource, /Text\("#.*index \+ 1.*"\)/);
  assert.match(activitiesSource, /Text\(row\.title\)[\s\S]*?\.lineLimit\(1\)/);
  assert.match(activitiesSource, /Text\("See all"\)[\s\S]*?Image\(systemName: "arrow\.right"\)/);
  assert.match(activitiesSource, /StaticConfiguration\(/);
  assert.match(activitiesSource, /\.supportedFamilies\(\[\.systemMedium\]\)/);
  assert.match(activitiesSource, /\.contentMarginsDisabled\(\)/);
  assert.match(activitiesSource, /\.padding\(\.horizontal, 16\)[\s\S]*?\.padding\(\.vertical, 10\)/);
  assert.match(activitiesSource, /Divider\(\)/);
  assert.match(activitiesSource, /kwiltLogoImage\(\)/);
  assert.match(activitiesSource, /kwiltLogoImage\(\)[\s\S]*?\.renderingMode\(\.template\)[\s\S]*?\.foregroundStyle\(KwiltPalette\.pine\)/);
  assert.doesNotMatch(activitiesSource, /RoundedRectangle\(cornerRadius: 5/);
  assert.match(activitiesSource, /ForEach[\s\S]*?\.frame\(maxHeight: \.infinity\)/);
  assert.doesNotMatch(activitiesSource, /Spacer\(minLength: 2\)/);
  assert.match(activitiesSource, /Nothing here/);
  assert.doesNotMatch(activitiesSource, /Image\(systemName: "square"\)/);
  assert.doesNotMatch(activitiesSource, /\.widgetURL\(/);
  assert.doesNotMatch(activitiesSource, /ActivityViewEntity|ActivitiesWidgetConfigurationIntent/);
  assert.doesNotMatch(activitiesSource, /row\.meta|scheduledAtMs|more\"/);
  assert.doesNotMatch(activitiesSource, /\.background\(KwiltPalette\.pine\)[\s\S]*?UnevenRoundedRectangle/);
});
