import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const cache = 'artifacts/native-ci/host';
const expectedFile = 'artifacts/native-ci/expected-host.json';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
// This recipe is both hashed and executed. Never add build flags only in YAML.
export const recipe = ['-workspace', 'ios/Kwilt.xcworkspace', '-scheme', 'Kwilt',
  '-configuration', 'Debug', '-sdk', 'iphonesimulator', '-destination', 'generic/platform=iOS Simulator',
  '-derivedDataPath', 'ios/build', 'ONLY_ACTIVE_ARCH=YES', 'CODE_SIGNING_ALLOWED=NO'];
export function hostIdentity({ nativeHash, toolchain }) {
  if (!/^[a-f0-9]{40,64}$/.test(nativeHash)) throw new Error('Invalid native fingerprint');
  for (const field of ['xcode', 'sdk', 'arch']) if (!toolchain[field]) throw new Error(`Missing ${field}`);
  const inputs = { version: 1, nativeHash, toolchain: { xcode: toolchain.xcode, sdk: toolchain.sdk, arch: toolchain.arch }, recipe };
  return { ...inputs, key: `kwilt-ios-host-v1-${sha(JSON.stringify(inputs))}` };
}
export function packHost({ app, cache, identity, commit }) {
  if (path.basename(app) !== 'Kwilt.app' || !fs.statSync(app).isDirectory()) throw new Error('Expected Kwilt.app');
  fs.mkdirSync(cache, { recursive: true });
  const archive = path.resolve(cache, 'host.tar.gz');
  execFileSync('tar', ['-czf', archive, '-C', path.dirname(app), path.basename(app)]);
  const receipt = { identity, commit, createdAt: new Date().toISOString(), sha256: sha(fs.readFileSync(archive)) };
  fs.writeFileSync(path.join(cache, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  return receipt;
}
export function verifyHost({ cache, identity }) {
  const receipt = JSON.parse(fs.readFileSync(path.join(cache, 'receipt.json'), 'utf8'));
  if (JSON.stringify(receipt.identity) !== JSON.stringify(identity)) throw new Error('Native host compatibility mismatch');
  if (receipt.sha256 !== sha(fs.readFileSync(path.join(cache, 'host.tar.gz')))) throw new Error('Native host checksum mismatch');
  return receipt;
}
function toolchain() {
  return { xcode: execFileSync('xcodebuild', ['-version'], { encoding: 'utf8' }).trim(),
    sdk: execFileSync('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-version'], { encoding: 'utf8' }).trim(),
    arch: process.arch };
}
function summary(text) {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
}
export function nativeExtraSources(root) {
  const extras = ['package-lock.json', 'modules', 'plugins', 'patches', 'scripts/e2e/native-host.mjs']
    .filter(p => fs.existsSync(path.join(root, p))).map(p => ({ type: fs.statSync(path.join(root, p)).isDirectory() ? 'dir' : 'file', filePath: p, reasons: ['native-ci-contract'] }));
  // CNG intentionally ignores generated ios/** (including unstable Xcode UUIDs).
  // Contents sources explicitly retain the resolved CocoaPods dependency graph.
  extras.push({ type: 'contents', id: 'native-ci-resolved-pods',
    contents: fs.readFileSync(path.join(root, 'ios/Podfile.lock'), 'utf8'), reasons: ['native-ci-contract'] });
  return extras;
}
export async function fingerprintNative(root) {
  const { createFingerprintAsync } = await import('@expo/fingerprint');
  return createFingerprintAsync(root, {
    platforms: ['ios'], hashAlgorithm: 'sha256', sourceSkips: 0, silent: true,
    // This repository generates native projects from source. Never hash random
    // generated Xcode identifiers; keep resolved pods as an explicit source.
    ignorePaths: ['ios/**', '**/xcuserdata', '**/*.xcuserstate'], extraSources: nativeExtraSources(root),
  });
}
async function main(command) {
  if (command === 'identity') {
    if (!fs.existsSync('ios/Kwilt.xcodeproj/project.pbxproj')) throw new Error('Generate iOS before fingerprinting');
    const fingerprint = await fingerprintNative(process.cwd());
    const identity = hostIdentity({ nativeHash: fingerprint.hash, toolchain: toolchain() });
    fs.mkdirSync(path.dirname(expectedFile), { recursive: true });
    fs.writeFileSync(expectedFile, JSON.stringify(identity, null, 2) + '\n');
    // Never emit fingerprint source contents: effective config can include secrets.
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `key=${identity.key}\n`);
    summary(`Native compatibility key: \`${identity.key}\``);
    return;
  }
  if (command === 'build') {
    execFileSync('xcodebuild', [...recipe, `ARCHS=${process.arch === 'arm64' ? 'arm64' : 'x86_64'}`, 'build'], { stdio: 'inherit' });
    const identity = JSON.parse(fs.readFileSync(expectedFile));
    packHost({ app: 'ios/build/Build/Products/Debug-iphonesimulator/Kwilt.app', cache, identity,
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() });
    return;
  }
  if (command === 'verify' || command === 'install') {
    const identity = fs.existsSync(expectedFile)
      ? JSON.parse(fs.readFileSync(expectedFile))
      : JSON.parse(fs.readFileSync(path.join(cache, 'receipt.json'))).identity;
    if (!fs.existsSync(expectedFile) && identity.key !== process.env.EXPECTED_NATIVE_KEY) throw new Error('Unexpected downloaded native host');
    if (JSON.stringify(hostIdentity(identity)) !== JSON.stringify(identity)) throw new Error('Native host recipe changed');
    if (JSON.stringify(toolchain()) !== JSON.stringify(identity.toolchain)) throw new Error('Runner toolchain differs from native host');
    const receipt = verifyHost({ cache, identity });
    summary(`Verified native host from \`${receipt.commit}\`; current JavaScript \`${process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()}\`.`);
    if (command === 'install') {
      if (!process.env.SIMULATOR_ID) throw new Error('SIMULATOR_ID required');
      const destination = 'artifacts/native-ci/installed';
      fs.mkdirSync(destination, { recursive: true });
      execFileSync('tar', ['-xzf', path.join(cache, 'host.tar.gz'), '-C', destination]);
      execFileSync('xcrun', ['simctl', 'install', process.env.SIMULATOR_ID, path.join(destination, 'Kwilt.app')], { stdio: 'inherit' });
    }
    return;
  }
  throw new Error('Expected identity, build, verify or install');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
}
