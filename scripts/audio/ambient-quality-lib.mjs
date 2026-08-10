const STEADY_RAIN_POLICY = Object.freeze({
  rmsSpreadCeilingDb: 4,
  rmsStdDevCeilingDb: 1.5,
  spectralFlatnessFloor: 0.35,
  spectralFlatnessSpreadCeiling: 0.08,
});

const STEADY_RAIN_DELIVERY_POLICY = Object.freeze({
  ...STEADY_RAIN_POLICY,
  spectralFlatnessFloor: 0.15,
});

function round(value, places = 2) {
  return Number(value.toFixed(places));
}

function requireFinite(values) {
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('Ambient analysis requires finite steady-rain measurements');
  }
}

export function evaluateSteadyRain(measurement, policy = STEADY_RAIN_POLICY) {
  requireFinite([
    measurement.rmsP05Dbfs,
    measurement.rmsP95Dbfs,
    measurement.rmsStdDevDb,
    measurement.spectralFlatnessP05,
    measurement.spectralFlatnessP95,
    policy.rmsSpreadCeilingDb,
    policy.rmsStdDevCeilingDb,
    policy.spectralFlatnessFloor,
    policy.spectralFlatnessSpreadCeiling,
  ]);

  const rmsSpreadDb = round(measurement.rmsP95Dbfs - measurement.rmsP05Dbfs);
  const spectralFlatnessSpread = round(
    measurement.spectralFlatnessP95 - measurement.spectralFlatnessP05,
  );
  const failures = [];

  if (rmsSpreadDb > policy.rmsSpreadCeilingDb) {
    failures.push(
      `slow loudness spread is ${rmsSpreadDb} dB (ceiling ${policy.rmsSpreadCeilingDb} dB)`,
    );
  }
  if (measurement.rmsStdDevDb > policy.rmsStdDevCeilingDb) {
    failures.push(
      `slow loudness deviation is ${round(measurement.rmsStdDevDb)} dB (ceiling ${policy.rmsStdDevCeilingDb} dB)`,
    );
  }
  if (measurement.spectralFlatnessP05 < policy.spectralFlatnessFloor) {
    failures.push(
      `spectral flatness drops to ${round(measurement.spectralFlatnessP05)} (floor ${policy.spectralFlatnessFloor})`,
    );
  }
  if (spectralFlatnessSpread > policy.spectralFlatnessSpreadCeiling) {
    failures.push(
      `spectral flatness varies by ${spectralFlatnessSpread} (ceiling ${policy.spectralFlatnessSpreadCeiling})`,
    );
  }

  return {
    passes: failures.length === 0,
    failures,
    rmsSpreadDb,
    spectralFlatnessSpread,
  };
}

export { STEADY_RAIN_DELIVERY_POLICY, STEADY_RAIN_POLICY };
