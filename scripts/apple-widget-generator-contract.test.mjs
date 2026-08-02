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

test('generated Focus widget offers configured one-tap standalone sessions', () => {
  assert.match(widgetGenerator, /getFocusWidgetSwift\(targetName\)/);
  assert.match(focusWidgetTemplate, /struct KwiltFocusWidget: Widget/);
  assert.match(focusWidgetTemplate, /struct FocusWidgetConfigurationIntent: WidgetConfigurationIntent/);
  assert.match(focusWidgetTemplate, /case ten = "10"/);
  assert.match(focusWidgetTemplate, /case twentyFive = "25"/);
  assert.match(focusWidgetTemplate, /case fifty = "50"/);
  assert.match(widgetGenerator, /autoStartStandaloneFocus=1&focusMinutes=/);
  assert.match(focusWidgetTemplate, /Text\(timerInterval: start\.\.\.end, countsDown: true\)/);
  assert.match(focusWidgetTemplate, /Text\("\\\\\(entry\.minutes\)"\)/);
  assert.match(widgetGenerator, /KwiltFocusWidget\(\)/);
});

test('generated Focus shortcuts fall back to the standalone Focus route', () => {
  assert.ok(widgetGenerator.includes('kwilt://today?autoStartStandaloneFocus=1&focusMinutes=\\\\(safeMinutes)&source=shortcut'));
  assert.match(widgetGenerator, /kwilt:\/\/today\?openStandaloneFocus=1&source=shortcut/);
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
