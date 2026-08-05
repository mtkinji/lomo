import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const plugin = await readFile(
  new URL('../plugins/withAttachmentQuickLook.js', import.meta.url),
  'utf8',
);
const appConfig = await readFile(new URL('../app.config.ts', import.meta.url), 'utf8');

test('the attachment preview plugin generates a Quick Look bridge', () => {
  assert.match(plugin, /import QuickLook/);
  assert.match(plugin, /QLPreviewControllerDataSource/);
  assert.match(plugin, /QLPreviewControllerDelegate/);
  assert.match(plugin, /URLSession\.shared\.downloadTask/);
  assert.match(plugin, /previewControllerDidDismiss/);
  assert.match(plugin, /FileManager\.default\.removeItem/);
  assert.match(plugin, /candidate == "\.\."/);
  assert.match(plugin, /RCT_EXTERN_MODULE\(KwiltAttachmentPreview/);
  assert.match(plugin, /previewRemoteURL/);
});

test('the app config registers the attachment Quick Look plugin', () => {
  assert.match(appConfig, /\.\/plugins\/withAttachmentQuickLook/);
});
