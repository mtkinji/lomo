import { createCookVoiceController } from './cookVoiceController';

describe('Cook voice controller', () => {
  it('maps deterministic intents to session commands and ignores duplicate transcripts', () => {
    const execute = jest.fn(); const controller = createCookVoiceController({ execute, now: () => 1000 });
    expect(controller.handle('next', { hasActiveSession: true })).toMatchObject({ state: 'handled', acknowledgement: 'Next step.' });
    expect(execute).toHaveBeenCalledWith({ type: 'next' });
    expect(controller.handle('next', { hasActiveSession: true })).toMatchObject({ state: 'duplicate' });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('requires an active session and routes open questions to a grounded-answer path', () => {
    const controller = createCookVoiceController({ execute: jest.fn(), now: () => 1000 });
    expect(controller.handle('next', { hasActiveSession: false })).toMatchObject({ state: 'no_session' });
    expect(controller.handle('can I substitute yogurt?', { hasActiveSession: true })).toMatchObject({ state: 'needs_grounded_answer' });
  });

  it('routes a cue-grounded timer request without inventing a duration', () => {
    const execute = jest.fn();
    const controller = createCookVoiceController({ execute, now: () => 1000 });

    expect(controller.handle('start a timer for this', { hasActiveSession: true })).toMatchObject({
      state: 'handled',
      acknowledgement: null,
    });
    expect(execute).toHaveBeenCalledWith({ type: 'start_suggested_timer' });
  });
});
