import {
  canPublishOnDeviceGenerationSnapshot,
  validateOnDeviceGenerationResult,
} from './onDeviceGenerationQuality';

describe('validateOnDeviceGenerationResult', () => {
  test('accepts and trims a direct writing result', () => {
    expect(validateOnDeviceGenerationResult({
      task: 'rewrite',
      prompt: 'Rewrite this warmly: I cannot attend.',
      output: '  I’m sorry, but I can’t attend.  ',
    })).toEqual({ accepted: true, text: 'I’m sorry, but I can’t attend.' });
  });

  test('rejects a rewrite that loses every meaningful source word', () => {
    expect(validateOnDeviceGenerationResult({
      task: 'rewrite',
      prompt: 'Rewrite this more warmly: I will be late.',
      output: "I'm hungry.",
    })).toEqual({ accepted: false, reason: 'meaning_not_preserved' });
  });

  test('withholds unrelated rewrite snapshots until source meaning becomes visible', () => {
    const input = {
      task: 'rewrite' as const,
      prompt: 'Rewrite this more warmly: I will be late.',
    };

    expect(canPublishOnDeviceGenerationSnapshot({
      ...input,
      output: "I'm hungry.",
    })).toBe(false);
    expect(canPublishOnDeviceGenerationSnapshot({
      ...input,
      output: "I'm sorry,",
    })).toBe(false);
    expect(canPublishOnDeviceGenerationSnapshot({
      ...input,
      output: "I'm sorry, but I will be late.",
    })).toBe(true);
  });

  test.each(['', '   ', 'Sure! Here is the corrected text: Hello.'])(
    'rejects empty or prefaced output: %p',
    (output) => {
      expect(validateOnDeviceGenerationResult({
        task: 'proofread',
        prompt: 'Proofread this: hello',
        output,
      })).toEqual({
        accepted: false,
        reason: output.trim() ? 'preface' : 'empty',
      });
    },
  );

  test('requires a summary to be materially shorter than its source', () => {
    const source = 'The committee discussed the picnic and assigned several follow-up actions. '.repeat(12);
    expect(validateOnDeviceGenerationResult({
      task: 'summarize',
      prompt: `Summarize this update:\n\n${source}`,
      output: source.slice(0, Math.floor(source.length * 0.7)),
    })).toEqual({ accepted: false, reason: 'not_concise' });

    expect(validateOnDeviceGenerationResult({
      task: 'summarize',
      prompt: `Summarize this update:\n\n${source}`,
      output: 'The committee assigned picnic follow-ups.',
    })).toEqual({ accepted: true, text: 'The committee assigned picnic follow-ups.' });
  });
});
