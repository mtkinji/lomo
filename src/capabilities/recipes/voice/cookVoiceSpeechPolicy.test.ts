import { createCookVoiceSpeechPolicy } from './cookVoiceSpeechPolicy';

describe('createCookVoiceSpeechPolicy', () => {
  it('uses natural speech without invoking the system fallback', async () => {
    const natural = { speak: jest.fn(async () => undefined), stop: jest.fn(async () => undefined) };
    const fallback = { speak: jest.fn(async () => undefined), stop: jest.fn(async () => undefined) };
    const speech = createCookVoiceSpeechPolicy({ natural, fallback });

    await speech.speak('Ready when you are.');

    expect(natural.speak).toHaveBeenCalledWith('Ready when you are.', undefined);
    expect(fallback.speak).not.toHaveBeenCalled();
  });

  it('falls back quietly when natural speech is unavailable', async () => {
    const natural = { speak: jest.fn(async () => { throw new Error('offline'); }), stop: jest.fn(async () => undefined) };
    const fallback = { speak: jest.fn(async () => undefined), stop: jest.fn(async () => undefined) };
    const speech = createCookVoiceSpeechPolicy({ natural, fallback });

    await expect(speech.speak('Try that again.')).resolves.toBeUndefined();

    expect(fallback.speak).toHaveBeenCalledWith('Try that again.', undefined);
  });

  it('stops both speech paths so an interruption cannot leave audio playing', async () => {
    const natural = { speak: jest.fn(async () => undefined), stop: jest.fn(async () => undefined) };
    const fallback = { speak: jest.fn(async () => undefined), stop: jest.fn(async () => undefined) };
    const speech = createCookVoiceSpeechPolicy({ natural, fallback });

    await speech.stop();

    expect(natural.stop).toHaveBeenCalled();
    expect(fallback.stop).toHaveBeenCalled();
  });
});
