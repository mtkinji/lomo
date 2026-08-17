import {
  buildOnDeviceGenerationBenchmarkPayload,
  buildOnDeviceTitleGateBenchmarkPayload,
} from './onDeviceGenerationBenchmark';

describe('on-device generation benchmark corpus', () => {
  test('covers every promoted local job with realistic inputs and all latency variants', () => {
    const payload = buildOnDeviceGenerationBenchmarkPayload(2);

    expect(payload.repetitions).toBe(2);
    expect(payload.variants).toEqual([
      'batch_cold',
      'batch_prewarmed',
      'stream_cold',
      'stream_prewarmed',
    ]);
    expect(payload.cases.map((entry) => entry.id)).toEqual([
      'proofread',
      'rewrite',
      'shorten',
      'summarize',
      'brainstorm',
      'thread_title',
    ]);
    expect(payload.cases.find((entry) => entry.id === 'shorten')!.prompt.length).toBeGreaterThan(400);
    expect(payload.cases.find((entry) => entry.id === 'summarize')!.prompt.length).toBeGreaterThan(900);
    expect(payload.cases.every((entry) => entry.maximumResponseTokens >= 24)).toBe(true);
  });

  test('builds a statistically useful cold-versus-warm title gate for physical devices', () => {
    const payload = buildOnDeviceTitleGateBenchmarkPayload();

    expect(payload.repetitions).toBe(30);
    expect(payload.variants).toEqual(['batch_cold', 'batch_prewarmed']);
    expect(payload.cases.map((entry) => entry.id)).toEqual(['thread_title']);
  });
});
