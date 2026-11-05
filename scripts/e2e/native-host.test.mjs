import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hostIdentity, packHost, verifyHost } from './native-host.mjs';
const toolchain = { xcode: 'Xcode 26.6 build A', sdk: '26.5', arch: 'arm64' };
const identity = hostIdentity({ nativeHash: 'a'.repeat(64), toolchain });
test('compatible native inputs reuse a host independently of JS commit', () => {
  assert.deepEqual(hostIdentity({ nativeHash: 'a'.repeat(64), toolchain }), identity);
  for (const changed of [
    { nativeHash: 'b'.repeat(64), toolchain },
    ...Object.keys(toolchain).map(key => ({ nativeHash: 'a'.repeat(64), toolchain: { ...toolchain, [key]: `${toolchain[key]}-changed` } })),
  ]) assert.notEqual(hostIdentity(changed).key, identity.key);
});
test('host restore rejects mismatched native inputs and corrupted artifacts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-host-test-'));
  try {
    const app = path.join(root, 'Kwilt.app'); fs.mkdirSync(app);
    fs.writeFileSync(path.join(app, 'Kwilt'), 'synthetic native binary');
    const cache = path.join(root, 'cache');
    packHost({ app, cache, identity, commit: 'original-native-commit' });
    assert.equal(verifyHost({ cache, identity }).commit, 'original-native-commit');
    assert.throws(() => verifyHost({ cache, identity: hostIdentity({ nativeHash: 'c'.repeat(64), toolchain }) }), /compatibility/);
    fs.appendFileSync(path.join(cache, 'host.tar.gz'), 'corrupt');
    assert.throws(() => verifyHost({ cache, identity }), /checksum/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test('an incomplete cache cannot be mistaken for a compatible host', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-host-test-'));
  try { assert.throws(() => verifyHost({ cache: root, identity })); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('CNG fingerprint invalidates resolved pods but ignores regenerated Xcode UUIDs and test YAML', async () => {
  const { nativeExtraSources, fingerprintNative } = await import('./native-host.mjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-cng-test-'));
  try {
    fs.mkdirSync(path.join(root, 'ios'));
    fs.writeFileSync(path.join(root, '.gitignore'), '/ios\n');
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'fixture', version: '1.0.0' }));
    const lock = path.join(root, 'ios/Podfile.lock');
    fs.writeFileSync(lock, 'PODS:\n  - Example (1.0.0)\n');
    const fingerprint = () => fingerprintNative(root);
    const first = await fingerprint();
    fs.writeFileSync(path.join(root, 'ios/project.pbxproj'), 'new random UUID');
    fs.writeFileSync(path.join(root, 'flow.yaml'), 'different UI assertion');
    assert.equal((await fingerprint()).hash, first.hash);
    fs.writeFileSync(lock, 'PODS:\n  - Example (2.0.0)\n');
    assert.notEqual((await fingerprint()).hash, first.hash);
    fs.unlinkSync(lock);
    assert.throws(() => nativeExtraSources(root), /ENOENT/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
