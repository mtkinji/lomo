import test from 'node:test';
import assert from 'node:assert/strict';
import policyData from '../../src/capabilities/games/audio/audioGainPolicy.json' with { type: 'json' };
import {
  evaluateAudioMeasurement,
  inferAudioCategory,
  parseEbur128Summary,
  parseLoudnormAnalysis,
  parseSilenceSummary,
  parseVolumeDetectSummary,
  shortCueGainDb,
} from './audio-audit-lib.mjs';

test('parses the final EBU R128 summary instead of an earlier interval', () => {
  const summary = parseEbur128Summary(`
    [Parsed_ebur128_0] t: 0.0999792 TARGET:-23 LUFS M:-19.4 S:-120.7 I:-19.4 LUFS
    Integrated loudness:
      I:         -18.2 LUFS
    True peak:
      Peak:       -1.7 dBFS
  `);

  assert.deepEqual(summary, { integratedLufs: -18.2, truePeakDbtp: -1.7 });
});

test('parses leading and trailing silence without treating an interior pause as either edge', () => {
  const summary = parseSilenceSummary(`
    silence_start: 0
    silence_end: 0.024 | silence_duration: 0.024
    silence_start: 0.45
    silence_end: 0.52 | silence_duration: 0.07
    silence_start: 1.72
    silence_end: 1.8 | silence_duration: 0.08
  `, 1.8);

  assert.deepEqual(summary, { leadingSilenceSeconds: 0.024, trailingSilenceSeconds: 0.08 });
});

test('infers current repository asset categories', () => {
  assert.equal(inferAudioCategory('assets/audio/sfx/list-tap.wav'), 'ui.micro');
  assert.equal(inferAudioCategory('assets/audio/sfx/mark-complete.wav'), 'ui.outcome');
  assert.equal(inferAudioCategory('assets/audio/sfx/focus-complete-chime.wav'), 'ui.outcome');
  assert.equal(inferAudioCategory('assets/audio/soundscapes/Focus Flow State.mp3'), 'focus.music');
  assert.equal(inferAudioCategory('assets/games/dice-roll.mp3'), 'game.mechanic');
  assert.equal(inferAudioCategory('assets/games/bank-coin-gather-1.mp3'), 'game.mechanic');
  assert.equal(inferAudioCategory('assets/games/success-hawk.mp3'), 'game.signature');
});

test('fails files outside loudness, peak, or leading-silence policy', () => {
  const category = 'game.signature';
  const policy = policyData.categories[category];
  const result = evaluateAudioMeasurement({
    category,
    integratedLufs: -15.8,
    truePeakDbtp: -0.4,
    leadingSilenceSeconds: 0.09,
    trailingSilenceSeconds: 0.1,
  }, policy);

  assert.equal(result.passes, false);
  assert.deepEqual(result.failures, [
    'loudness is 2.2 LU above the -18 LUFS target (tolerance 1 LU)',
    'true peak -0.4 dBTP exceeds the -1.5 dBTP ceiling',
    'leading silence 90 ms exceeds the 30 ms ceiling',
  ]);
});

test('passes a mastered file inside category tolerances', () => {
  const category = 'game.pattern';
  const result = evaluateAudioMeasurement({
    category,
    integratedLufs: -20.6,
    truePeakDbtp: -2.8,
    leadingSilenceSeconds: 0.012,
    trailingSilenceSeconds: 0.08,
  }, policyData.categories[category]);

  assert.deepEqual(result, { passes: true, failures: [] });
});

test('extracts the final loudnorm analysis block for deterministic second-pass mastering', () => {
  const analysis = parseLoudnormAnalysis(`
    [Parsed_loudnorm_0] {
      "input_i" : "-15.10",
      "input_tp" : "-0.08",
      "input_lra" : "2.30",
      "input_thresh" : "-25.20",
      "output_i" : "-23.97",
      "output_tp" : "-2.00",
      "output_lra" : "2.20",
      "output_thresh" : "-34.10",
      "normalization_type" : "dynamic",
      "target_offset" : "-0.03"
    }
  `);

  assert.deepEqual(analysis, {
    inputI: -15.1,
    inputTp: -0.08,
    inputLra: 2.3,
    inputThresh: -25.2,
    targetOffset: -0.03,
  });
});

test('uses loudness gain for a short cue without exceeding its true-peak ceiling', () => {
  assert.equal(shortCueGainDb({
    integratedLufs: -26,
    truePeakDbtp: -8.3,
    targetLufs: -22,
    truePeakCeilingDbtp: -3,
  }), 4);

  assert.equal(shortCueGainDb({
    integratedLufs: -31,
    truePeakDbtp: -4,
    targetLufs: -22,
    truePeakCeilingDbtp: -3,
  }), 1);
});

test('parses RMS and sample peak for cues shorter than the EBU gating window', () => {
  assert.deepEqual(parseVolumeDetectSummary(`
    [Parsed_volumedetect_0] mean_volume: -25.7 dB
    [Parsed_volumedetect_0] max_volume: -8.3 dB
  `), { meanVolumeDbfs: -25.7, maxVolumeDbfs: -8.3 });
});
