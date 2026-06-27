export type OpenAiErrorDetails = {
  message: string;
  type?: string;
  code?: string;
  param?: string | null;
  raw: string;
};

export type KwiltProxyErrorDetails = {
  code?: string;
  retryAt?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseKwiltProxyError(errorText: string): KwiltProxyErrorDetails | null {
  try {
    const parsed: unknown = JSON.parse(errorText);
    if (!isRecord(parsed)) return null;
    const topCode = typeof parsed.code === 'string' ? parsed.code : undefined;
    const topRetryAt = typeof parsed.retryAt === 'string' ? parsed.retryAt : undefined;
    const err = parsed.error;
    const errCode = isRecord(err) && typeof err.code === 'string' ? err.code : undefined;
    const errRetryAt = isRecord(err) && typeof err.retryAt === 'string' ? err.retryAt : undefined;
    const code = topCode ?? errCode;
    const retryAt = topRetryAt ?? errRetryAt;
    if (!code && !retryAt) return null;
    return { code, retryAt };
  } catch {
    return null;
  }
}

export function parseOpenAiError(errorText: string): OpenAiErrorDetails {
  try {
    const parsed: unknown = JSON.parse(errorText);
    const error = isRecord(parsed) ? parsed.error : undefined;
    if (isRecord(error)) {
      return {
        message: typeof error.message === 'string' ? error.message : 'Unknown error',
        type: typeof error.type === 'string' ? error.type : undefined,
        code: typeof error.code === 'string' ? error.code : undefined,
        param: typeof error.param === 'string' || error.param === null ? error.param : null,
        raw: errorText,
      };
    }
  } catch {
    // Not JSON, return as-is.
  }
  return {
    message: errorText || 'Unknown error',
    raw: errorText,
  };
}

export function isOpenAiQuotaExceeded(status: number, errorText: string): boolean {
  const proxy = parseKwiltProxyError(errorText);
  if (proxy?.code === 'quota_exceeded') {
    return true;
  }

  if (status === 429) {
    const error = parseOpenAiError(errorText);
    const lowerMessage = error.message.toLowerCase();
    const lowerCode = (error.code ?? '').toLowerCase();
    return (
      lowerCode === 'insufficient_quota' ||
      lowerMessage.includes('insufficient_quota') ||
      lowerMessage.includes('exceeded your current quota') ||
      lowerMessage.includes('quota')
    );
  }

  const lower = (errorText ?? '').toLowerCase();
  return lower.includes('insufficient_quota') || lower.includes('exceeded your current quota');
}

export function isOpenAiRateLimited(status: number, errorText: string): boolean {
  if (status !== 429) return false;
  const error = parseOpenAiError(errorText);
  const lowerMessage = error.message.toLowerCase();
  const lowerCode = (error.code ?? '').toLowerCase();
  return (
    lowerCode === 'rate_limit_exceeded' ||
    lowerMessage.includes('rate limit') ||
    (status === 429 && !isOpenAiQuotaExceeded(status, errorText))
  );
}
