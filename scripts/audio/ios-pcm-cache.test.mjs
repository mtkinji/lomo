import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cacheSource = path.join(
  repoRoot,
  'modules/kwilt-seamless-loop/ios/LoopPCMCache.swift',
);
const admittedMp3 = path.join(
  repoRoot,
  'assets/audio/soundscapes/deep-work-drift-loop-c24a34f97230.mp3',
);

test('iOS PCM cache decodes an admitted MP3 through its final frame', {
  skip: process.platform === 'darwin' ? false : 'requires macOS AVFAudio',
  timeout: 30_000,
}, () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'kwilt-ios-pcm-cache-'));
  const combinedSource = path.join(directory, 'main.swift');
  const executable = path.join(directory, 'pcm-cache-probe');

  try {
    writeFileSync(combinedSource, `${readFileSync(cacheSource, 'utf8')}\n${String.raw`
@main
struct PCMCacheProbe {
  static func main() async throws {
    let source = URL(fileURLWithPath: CommandLine.arguments[1])
    let prepared = try await LoopPCMCache().prepare(
      uri: source.absoluteString,
      assetKey: "pcm-cache-eof-regression",
      expectedSampleRateHz: 48_000,
      expectedChannels: 2
    )
    print(prepared.frameLength)
  }
}
`}`);

    execFileSync('xcrun', [
      'swiftc',
      '-parse-as-library',
      '-framework',
      'AVFAudio',
      combinedSource,
      '-o',
      executable,
    ]);
    const output = execFileSync(executable, [admittedMp3], {
      encoding: 'utf8',
      env: { ...process.env, CFFIXED_USER_HOME: directory },
    });

    assert.match(output, /^8551200\s*$/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
