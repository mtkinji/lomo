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

test('generated Money widgets preserve the clock-style meter grammar', () => {
  assert.match(moneyWidgetTemplate, /ForEach\(0\.\.<moneyTickCount/);
  assert.match(moneyWidgetTemplate, /periodElapsedPercent:/);
  assert.match(moneyWidgetTemplate, /overBudgetTickWidth/);
  assert.match(moneyWidgetTemplate, /\.font\(\.custom\("Inter-Black"/);
  assert.doesNotMatch(moneyWidgetTemplate, /StrokeStyle\([^\n]*dash:/);
});

test('Money widgets keep the category clock tile centered and give Flexible Money its own answer-card style', () => {
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
  assert.match(categoryView, /VStack\(alignment: \.center/);
  assert.match(categoryView, /\.multilineTextAlignment\(\.center\)/);
  assert.match(categoryView, /category\.status == "over" \? MoneyWidgetPalette\.over : \.primary/);
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
  assert.match(focusWidgetTemplate, /Text\("Choose time and audio"\)/);
  assert.match(focusWidgetTemplate, /Text\(timerInterval: start\.\.\.end, countsDown: true\)/);
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
    assert.match(source, /font\(\.system\(size: 14, weight: \.semibold, design: \.rounded\)\)/);
    assert.match(source, /Text\(context\.state\.title\)/);
    assert.doesNotMatch(source, /marquee|scrolling/i);
  }
});

test('generated Chat widget is a private static fresh-entry launcher', () => {
  assert.match(widgetGenerator, /getChatWidgetSwift\(targetName\)/);
  assert.match(chatWidgetTemplate, /struct KwiltChatWidget: Widget/);
  assert.match(chatWidgetTemplate, /kwilt:\/\/chat\?entry=fresh&source=widget/);
  assert.match(chatWidgetTemplate, /Text\("Chat"\)/);
  assert.match(chatWidgetTemplate, /Text\("Start a thought"\)/);
  assert.match(chatWidgetTemplate, /\.supportedFamilies\(\[\.systemSmall\]\)/);
  assert.doesNotMatch(chatWidgetTemplate, /thread|message|transcript|record/i);
  assert.match(widgetGenerator, /KwiltChatWidget\(\)/);
});
