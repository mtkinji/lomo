import path from 'node:path';

const SUPPORTED_CATEGORIES = new Set([
  'ui.micro',
  'ui.outcome',
  'game.mechanic',
  'game.signature',
  'game.pattern',
  'game.music',
  'focus.music',
]);

export function isAudioCategory(value) {
  return SUPPORTED_CATEGORIES.has(value);
}

export function parseEbur128Summary(stderr) {
  const integratedMatches = [...stderr.matchAll(/\bI:\s*(-?\d+(?:\.\d+)?)\s+LUFS/g)];
  const peakMatches = [...stderr.matchAll(/\bPeak:\s*(-?\d+(?:\.\d+)?)\s+dBFS/g)];
  const integratedLufs = Number(integratedMatches.at(-1)?.[1]);
  const truePeakDbtp = Number(peakMatches.at(-1)?.[1]);

  if (!Number.isFinite(integratedLufs) || !Number.isFinite(truePeakDbtp)) {
    throw new Error('FFmpeg did not emit a complete EBU R128 summary');
  }

  return { integratedLufs, truePeakDbtp };
}

export function parseLoudnormAnalysis(stderr) {
  const blocks = [...stderr.matchAll(/\{[^{}]*"input_i"[^{}]*\}/gs)];
  const block = blocks.at(-1)?.[0];
  if (!block) throw new Error('FFmpeg did not emit a loudnorm analysis block');
  const parsed = JSON.parse(block);
  const analysis = {
    inputI: Number(parsed.input_i),
    inputTp: Number(parsed.input_tp),
    inputLra: Number(parsed.input_lra),
    inputThresh: Number(parsed.input_thresh),
    targetOffset: Number(parsed.target_offset),
  };
  if (Object.values(analysis).some((value) => !Number.isFinite(value))) {
    throw new Error('FFmpeg emitted an incomplete loudnorm analysis block');
  }
  return analysis;
}

export function parseSilenceSummary(stderr, durationSeconds) {
  const starts = [...stderr.matchAll(/silence_start:\s*(\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]));
  const ends = [...stderr.matchAll(/silence_end:\s*(\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]));
  const leadingSilenceSeconds = starts[0] <= 0.001 && Number.isFinite(ends[0]) ? ends[0] : 0;
  const lastStart = starts.at(-1);
  const lastEnd = ends.at(-1);
  const trailingSilenceSeconds = Number.isFinite(lastStart)
    && Number.isFinite(lastEnd)
    && Math.abs(lastEnd - durationSeconds) <= 0.02
    ? Number(Math.max(0, durationSeconds - lastStart).toFixed(6))
    : 0;

  return { leadingSilenceSeconds, trailingSilenceSeconds };
}

export function inferAudioCategory(filePath) {
  const normalized = filePath.split(path.sep).join('/').toLowerCase();
  if (normalized.includes('/soundscapes/')) return 'focus.music';
  if (normalized.endsWith('/list-tap.wav')) return 'ui.micro';
  if (normalized.endsWith('/mark-complete.wav')) return 'ui.outcome';
  if (normalized.includes('/games/music/')) return 'game.music';
  if (/\/pattern-(coral|pine|gold|sky|violet|rose|success|miss)\./.test(normalized)) return 'game.pattern';
  if (/\/dice-roll(?:-\d+)?\./.test(normalized) || /\/bank-(lock-in|doubles-hit|seven-release)\./.test(normalized)) {
    return 'game.mechanic';
  }
  if (/\/(success-|failure-|bank-bust|doubles-celebration)/.test(normalized)) return 'game.signature';
  return null;
}

export function evaluateAudioMeasurement(measurement, policy) {
  const failures = [];
  const loudnessDelta = measurement.integratedLufs - policy.targetLufs;
  if (Math.abs(loudnessDelta) > policy.allowedSpreadLu) {
    const distance = Number(Math.abs(loudnessDelta).toFixed(1));
    failures.push(
      `loudness is ${distance} LU ${loudnessDelta > 0 ? 'above' : 'below'} the ${policy.targetLufs} LUFS target (tolerance ${policy.allowedSpreadLu} LU)`,
    );
  }
  if (measurement.truePeakDbtp > policy.truePeakCeilingDbtp) {
    failures.push(
      `true peak ${measurement.truePeakDbtp} dBTP exceeds the ${policy.truePeakCeilingDbtp} dBTP ceiling`,
    );
  }
  if (measurement.leadingSilenceSeconds > 0.03) {
    failures.push(
      `leading silence ${Math.round(measurement.leadingSilenceSeconds * 1_000)} ms exceeds the 30 ms ceiling`,
    );
  }
  return { passes: failures.length === 0, failures };
}
