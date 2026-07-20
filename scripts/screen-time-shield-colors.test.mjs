import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const generator = await readFile(new URL('../plugins/appleEcosystem/screenTimeShieldExtensions.js', import.meta.url), 'utf8');

test('Kwilt Goals keeps the shield on an explicit dark material', () => {
  assert.match(generator, /backgroundBlurStyle: \.systemMaterialDark,/);
});

test('Kwilt Goals uses pine700 for the shield', () => {
  assert.match(generator, /UIColor\(red: 0\.192, green: 0\.333, blue: 0\.271, alpha: 1\.0\)/);
});
