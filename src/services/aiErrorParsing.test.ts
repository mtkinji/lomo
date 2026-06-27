import {
  isOpenAiQuotaExceeded,
  isOpenAiRateLimited,
  parseKwiltProxyError,
  parseOpenAiError,
} from './aiErrorParsing';

describe('AI error parsing', () => {
  it('parses Kwilt proxy quota errors from top-level fields', () => {
    expect(
      parseKwiltProxyError(
        JSON.stringify({
          code: 'quota_exceeded',
          retryAt: '2026-06-27T15:00:00.000Z',
        }),
      ),
    ).toEqual({
      code: 'quota_exceeded',
      retryAt: '2026-06-27T15:00:00.000Z',
    });
  });

  it('parses Kwilt proxy quota errors from nested error fields', () => {
    expect(
      parseKwiltProxyError(
        JSON.stringify({
          error: {
            code: 'quota_exceeded',
            retryAt: '2026-06-27T15:00:00.000Z',
          },
        }),
      ),
    ).toEqual({
      code: 'quota_exceeded',
      retryAt: '2026-06-27T15:00:00.000Z',
    });
  });

  it('returns null for non-proxy error bodies', () => {
    expect(parseKwiltProxyError('not json')).toBeNull();
    expect(parseKwiltProxyError(JSON.stringify({ error: { message: 'plain error' } }))).toBeNull();
  });

  it('parses OpenAI error details and falls back to raw text', () => {
    expect(
      parseOpenAiError(
        JSON.stringify({
          error: {
            message: 'Rate limit reached',
            type: 'requests',
            code: 'rate_limit_exceeded',
            param: null,
          },
        }),
      ),
    ).toEqual({
      message: 'Rate limit reached',
      type: 'requests',
      code: 'rate_limit_exceeded',
      param: null,
      raw: expect.any(String),
    });

    expect(parseOpenAiError('plain text failure')).toEqual({
      message: 'plain text failure',
      raw: 'plain text failure',
    });
  });

  it('distinguishes quota exhaustion from retryable rate limits', () => {
    const quotaText = JSON.stringify({
      error: {
        message: 'You exceeded your current quota.',
        code: 'insufficient_quota',
      },
    });
    const rateLimitText = JSON.stringify({
      error: {
        message: 'Rate limit reached for gpt-4o-mini.',
        code: 'rate_limit_exceeded',
      },
    });

    expect(isOpenAiQuotaExceeded(429, quotaText)).toBe(true);
    expect(isOpenAiRateLimited(429, quotaText)).toBe(false);

    expect(isOpenAiQuotaExceeded(429, rateLimitText)).toBe(false);
    expect(isOpenAiRateLimited(429, rateLimitText)).toBe(true);
  });

  it('treats Kwilt proxy quota errors as quota exhaustion regardless of status', () => {
    const proxyText = JSON.stringify({ error: { code: 'quota_exceeded' } });

    expect(isOpenAiQuotaExceeded(403, proxyText)).toBe(true);
    expect(isOpenAiRateLimited(403, proxyText)).toBe(false);
  });
});
