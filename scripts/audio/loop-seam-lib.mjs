const DEFAULT_LOOP_POLICY = Object.freeze({
  silenceCeilingSeconds: 0.03,
  boundaryRmsDeltaCeilingDb: 3,
  endpointJumpFloorDbfs: -36,
  endpointOutlierCeilingDb: 12,
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

function worstChannelBoundaryDiscontinuities(startSamples, endSamples, channels) {
  let worstEndpointJump = 0;
  let worstDerivativeJump = 0;
  const localDerivatives = [];
  const endLastFrame = endSamples.length - channels;
  const endPreviousFrame = endLastFrame - channels;
  for (let channel = 0; channel < channels; channel += 1) {
    const endpointJump = startSamples[channel] - endSamples[endLastFrame + channel];
    const startDerivative = startSamples[channels + channel] - startSamples[channel];
    const endDerivative = endSamples[endLastFrame + channel] - endSamples[endPreviousFrame + channel];
    worstEndpointJump = Math.max(worstEndpointJump, Math.abs(endpointJump));
    worstDerivativeJump = Math.max(
      worstDerivativeJump,
      Math.abs(startDerivative - endDerivative),
    );
    for (let index = channels + channel; index < startSamples.length; index += channels) {
      localDerivatives.push(Math.abs(startSamples[index] - startSamples[index - channels]));
    }
    for (let index = channels + channel; index < endSamples.length; index += channels) {
      localDerivatives.push(Math.abs(endSamples[index] - endSamples[index - channels]));
    }
  }
  localDerivatives.sort((a, b) => a - b);
  const referenceIndex = Math.min(
    localDerivatives.length - 1,
    Math.floor(localDerivatives.length * 0.99),
  );
  const endpointJumpDbfs = round(amplitudeToDbfs(worstEndpointJump));
  const endpointDerivativeReferenceDbfs = round(amplitudeToDbfs(localDerivatives[referenceIndex] ?? 0));
  return {
    worstEndpointJumpDbfs: endpointJumpDbfs,
    endpointDerivativeReferenceDbfs,
    endpointOutlierDb: round(endpointJumpDbfs - endpointDerivativeReferenceDbfs),
    worstDerivativeJumpDbfs: round(amplitudeToDbfs(worstDerivativeJump)),
  };
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
  const discontinuities = worstChannelBoundaryDiscontinuities(startSamples, endSamples, channels);

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
    ...discontinuities,
  };
}

export function evaluateLoopSeam(measurement, policy = DEFAULT_LOOP_POLICY) {
  requireFinite([
    measurement.leadingSilenceSeconds,
    measurement.trailingSilenceSeconds,
    measurement.startRmsDbfs,
    measurement.endRmsDbfs,
    measurement.worstEndpointJumpDbfs,
    measurement.endpointDerivativeReferenceDbfs,
    measurement.endpointOutlierDb,
    measurement.worstDerivativeJumpDbfs,
    policy.silenceCeilingSeconds,
    policy.boundaryRmsDeltaCeilingDb,
    policy.endpointJumpFloorDbfs,
    policy.endpointOutlierCeilingDb,
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
  if (
    measurement.worstEndpointJumpDbfs > policy.endpointJumpFloorDbfs
    && measurement.endpointOutlierDb > policy.endpointOutlierCeilingDb
  ) {
    failures.push(
      `endpoint jump ${measurement.worstEndpointJumpDbfs} dBFS is ${measurement.endpointOutlierDb} dB above local waveform motion (ceiling ${policy.endpointOutlierCeilingDb} dB)`,
    );
  }

  return {
    passes: failures.length === 0,
    failures,
    rmsDeltaDb,
    worstEndpointJumpDbfs: measurement.worstEndpointJumpDbfs,
    endpointDerivativeReferenceDbfs: measurement.endpointDerivativeReferenceDbfs,
    endpointOutlierDb: measurement.endpointOutlierDb,
    worstDerivativeJumpDbfs: measurement.worstDerivativeJumpDbfs,
  };
}

export { DEFAULT_LOOP_POLICY };
