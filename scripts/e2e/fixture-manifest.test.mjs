import test from 'node:test';
import assert from 'node:assert/strict';
import { startFixtureManifest } from './fixture-manifest.mjs';
test('each fixture launch gets the already validated manifest without regenerating it', async () => {
  const manifest = { id: 'synthetic', launchAsset: { url: 'http://localhost:8081/index.bundle?platform=ios' }, extra: { mode: 'workspace' } };
  const { server, url } = await startFixtureManifest(manifest);
  try {
    for (let i = 0; i < 3; i++) {
      const response = await fetch(`${url}?disableOnboarding=1`);
      assert.equal(response.headers.get('expo-protocol-version'), '0');
      assert.deepEqual(await response.json(), manifest);
    }
    assert.equal((await fetch(`${url}other`)).status, 404);
    assert.equal((await fetch(url, { method: 'POST' })).status, 405);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
test('fixture manifest cannot point the native bundle at an external service', async () => {
  await assert.rejects(startFixtureManifest({ launchAsset: { url: 'https://example.com/app.bundle' } }), /local Metro/);
});
