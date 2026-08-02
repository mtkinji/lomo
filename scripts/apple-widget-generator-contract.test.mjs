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

test('generated Money widgets include their currency formatting dependency', () => {
  assert.match(moneyWidgetTemplate, /formatCurrency\(cents:/);
  assert.match(widgetGenerator, /static let currency: NumberFormatter/);
  assert.match(widgetGenerator, /func formatCurrency\(cents: Double\?\) -> String\?/);
});
