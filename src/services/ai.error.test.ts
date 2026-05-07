import { KwiltAiQuotaExceededError } from './ai';

describe('KwiltAiQuotaExceededError', () => {
  it('is an Error instance', () => {
    expect(new KwiltAiQuotaExceededError()).toBeInstanceOf(Error);
  });

  it('uses a default message and quota_exceeded code when no params are provided', () => {
    const err = new KwiltAiQuotaExceededError();
    expect(err.message).toBe('AI quota exceeded');
    expect(err.code).toBe('quota_exceeded');
    expect(err.name).toBe('KwiltAiQuotaExceededError');
    expect(err.retryAt).toBeUndefined();
  });

  it('honors a custom message', () => {
    const err = new KwiltAiQuotaExceededError({ message: 'AI credits exhausted' });
    expect(err.message).toBe('AI credits exhausted');
    expect(err.code).toBe('quota_exceeded');
  });

  it('threads the retryAt timestamp through when provided', () => {
    const retryAt = '2026-04-15T16:00:00.000Z';
    const err = new KwiltAiQuotaExceededError({ retryAt });
    expect(err.retryAt).toBe(retryAt);
  });

  it('is catchable as an Error subclass', () => {
    let caught: unknown = null;
    try {
      throw new KwiltAiQuotaExceededError();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(KwiltAiQuotaExceededError);
    expect(caught).toBeInstanceOf(Error);
  });
});
