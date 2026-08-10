const DEFAULT_LOOP_POLICY = Object.freeze({
  silenceCeilingSeconds: 0.03,
  boundaryRmsDeltaCeilingDb: 3,
});

function requireFinite(values) {
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('Loop analysis requires finite loop seam measurements');
  }
}

function round(value, places = 2) {
  return Number(value.toFixed(places));
}

function amplitudeToDbfs(value) {
  return 20 * Math.log10(Math.max(Math.abs(value), 1e-12));
}

function monoFrames(samples, channels) {
  if (!(samples instanceof Float32Array) || samples.length === 0) {
    throw new Error('Loop analysis requires non-empty Float32Array samples');
  }
  if (!Number.isInteger(channels) || channels < 1 || samples.length % channels !== 0) {
    throw new Error('Loop analysis requires a valid interleaved channel count');
  }
  const frames = new Float64Array(samples.length / channels);
  for (let frame = 0; frame < frames.length; frame += 1) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      sum += samples[frame * channels + channel];
    }
    frames[frame] = sum / channels;
  }
  return frames;
}

function rmsDbfs(frames) {
  let energy = 0;
  for (const sample of frames) energy += sample * sample;
  return amplitudeToDbfs(Math.sqrt(energy / frames.length));
}

function boundarySilenceSeconds(frames, threshold, sampleRateHz, fromStart) {
  let silentFrames = 0;
  if (fromStart) {
    while (silentFrames < frames.length && Math.abs(frames[silentFrames]) <= threshold) silentFrames += 1;
  } else {
    while (
      silentFrames < frames.length
      && Math.abs(frames[frames.length - 1 - silentFrames]) <= threshold
    ) silentFrames += 1;
  }
  return silentFrames / sampleRateHz;
}

export function measureLoopBoundary({
  startSamples,
  endSamples,
  sampleRateHz,
  channels,
  silenceThresholdDbfs = -60,
}) {
  requireFinite([sampleRateHz, channels, silenceThresholdDbfs]);
  if (sampleRateHz <= 0) throw new Error('Loop analysis requires a positive sample rate');
  const startFrames = monoFrames(startSamples, channels);
  const endFrames = monoFrames(endSamples, channels);
  if (startFrames.length < 2 || endFrames.length < 2) {
    throw new Error('Loop analysis requires at least two frames at each boundary');
  }

  const threshold = 10 ** (silenceThresholdDbfs / 20);
  const startDerivative = startFrames[1] - startFrames[0];
  const endDerivative = endFrames[endFrames.length - 1] - endFrames[endFrames.length - 2];

  return {
    leadingSilenceSeconds: round(
      boundarySilenceSeconds(startFrames, threshold, sampleRateHz, true),
      6,
    ),
    trailingSilenceSeconds: round(
      boundarySilenceSeconds(endFrames, threshold, sampleRateHz, false),
      6,
    ),
    startRmsDbfs: round(rmsDbfs(startFrames)),
    endRmsDbfs: round(rmsDbfs(endFrames)),
    derivativeJumpDbfs: round(amplitudeToDbfs(startDerivative - endDerivative)),
  };
}

export function evaluateLoopSeam(measurement, policy = DEFAULT_LOOP_POLICY) {
  requireFinite([
    measurement.leadingSilenceSeconds,
    measurement.trailingSilenceSeconds,
    measurement.startRmsDbfs,
    measurement.endRmsDbfs,
    measurement.derivativeJumpDbfs,
    policy.silenceCeilingSeconds,
    policy.boundaryRmsDeltaCeilingDb,
  ]);

  const failures = [];
  const leadingMs = Math.round(measurement.leadingSilenceSeconds * 1_000);
  const trailingMs = Math.round(measurement.trailingSilenceSeconds * 1_000);
  const ceilingMs = Math.round(policy.silenceCeilingSeconds * 1_000);
  if (measurement.leadingSilenceSeconds > policy.silenceCeilingSeconds) {
    failures.push(`leading silence ${leadingMs} ms exceeds the ${ceilingMs} ms loop ceiling`);
  }
  if (measurement.trailingSilenceSeconds > policy.silenceCeilingSeconds) {
    failures.push(`trailing silence ${trailingMs} ms exceeds the ${ceilingMs} ms loop ceiling`);
  }

  const rmsDeltaDb = round(Math.abs(measurement.startRmsDbfs - measurement.endRmsDbfs));
  if (rmsDeltaDb > policy.boundaryRmsDeltaCeilingDb) {
    failures.push(
      `boundary window energy differs by ${rmsDeltaDb} dB (ceiling ${policy.boundaryRmsDeltaCeilingDb} dB)`,
    );
  }

  return {
    passes: failures.length === 0,
    failures,
    rmsDeltaDb,
    derivativeJumpDbfs: measurement.derivativeJumpDbfs,
  };
}

export { DEFAULT_LOOP_POLICY };
