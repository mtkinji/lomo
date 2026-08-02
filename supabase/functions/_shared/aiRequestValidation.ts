type ValidationResult = { ok: true } | { ok: false; message: string };

function invalid(message: string): ValidationResult { return { ok: false, message }; }
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validLocalDataUrl(value: unknown, allowed: readonly string[]): boolean {
  if (typeof value !== 'string') return false;
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  return Boolean(match && allowed.includes(match[1]) && match[2].length <= 6_700_000);
}

function validateAgentJudgmentRequest(parsed: Record<string, unknown>): ValidationResult {
  const allowedKeys = new Set(['model', 'store', 'reasoning', 'max_output_tokens', 'input', 'text']);
  if (Object.keys(parsed).some((key) => !allowedKeys.has(key))) {
    return invalid('agent judgment contains unsupported request fields');
  }
  if (parsed.model !== 'gpt-5.6-luna' || parsed.store !== false) {
    return invalid('agent judgment requires the routed ephemeral model');
  }
  if (parsed.tools != null || parsed.background != null) {
    return invalid('agent judgment does not allow tools or background mode');
  }
  if (!isRecord(parsed.reasoning) || parsed.reasoning.effort !== 'low' ||
    Object.keys(parsed.reasoning).some((key) => key !== 'effort')) {
    return invalid('agent judgment requires low reasoning effort');
  }
  if (!Number.isInteger(parsed.max_output_tokens) ||
    (parsed.max_output_tokens as number) < 1 || (parsed.max_output_tokens as number) > 800) {
    return invalid('agent judgment output budget is invalid');
  }
  if (!Array.isArray(parsed.input) || parsed.input.length < 1 || parsed.input.length > 2) {
    return invalid('agent judgment input must contain one or two messages');
  }
  let inputLength = 0;
  for (const item of parsed.input) {
    if (!isRecord(item) || (item.role !== 'user' && item.role !== 'system') || typeof item.content !== 'string' ||
      Object.keys(item).some((key) => key !== 'role' && key !== 'content')) {
      return invalid('agent judgment input message is invalid');
    }
    inputLength += item.content.length;
  }
  if (inputLength > 12_000) return invalid('agent judgment prompt is too large');
  const format = isRecord(parsed.text) ? parsed.text.format : undefined;
  if (!isRecord(parsed.text) || Object.keys(parsed.text).some((key) => key !== 'format') ||
    !isRecord(format) || format.type !== 'json_schema' || format.name !== 'kwilt_agent_judgment' ||
    format.strict !== true || !isRecord(format.schema)) {
    return invalid('agent judgment requires strict structured output');
  }
  return { ok: true };
}

export function validateKwiltAiRequestShape(
  route: string,
  parsed: unknown,
  aiJob: string,
): ValidationResult {
  if (!isRecord(parsed)) return invalid('Invalid JSON body');

  if (route === '/v1/chat/completions') {
    const msgs = parsed.messages;
    if (!Array.isArray(msgs) || msgs.length < 1) return invalid('messages must be a non-empty array');
    if (msgs.length > 40) return invalid('messages too long');
    for (const message of msgs) {
      if (!isRecord(message) || typeof message.role !== 'string') return invalid('invalid message');
      if (typeof message.content === 'string' && message.content.length > 20_000) {
        return invalid('message.content too large');
      }
    }
    return { ok: true };
  }

  if (route === '/v1/responses') {
    if (!Array.isArray(parsed.input) || parsed.input.length < 1 || parsed.input.length > 40) {
      return invalid('input must be a bounded non-empty array');
    }
    if (parsed.store === true || parsed.background === true) {
      return invalid('stored and background responses are not allowed');
    }
    if (aiJob === 'agent_judgment') return validateAgentJudgmentRequest(parsed);
    if (aiJob === 'current_information') {
      if (!Array.isArray(parsed.tools) || parsed.tools.length !== 1 || !isRecord(parsed.tools[0]) ||
        parsed.tools[0].type !== 'web_search') {
        return invalid('current information requires hosted web_search');
      }
      const hasMultimodal = parsed.input.some((item: unknown) => isRecord(item) && Array.isArray(item.content) &&
        item.content.some((part: unknown) => isRecord(part) && (part.type === 'input_image' || part.type === 'input_file')));
      return hasMultimodal ? invalid('web search cannot inspect attachments') : { ok: true };
    }
    if (aiJob !== 'unified_chat_attachment') return invalid('responses job is not allowed');
    if (parsed.tools != null) return invalid('attachment inspection does not allow tools');
    if (parsed.input.length !== 1 || !isRecord(parsed.input[0]) || parsed.input[0].role !== 'user' ||
      !Array.isArray(parsed.input[0].content)) return invalid('invalid attachment input');
    const parts = parsed.input[0].content;
    if (parts.length < 2 || parts.length > 4 || !isRecord(parts[0]) || parts[0].type !== 'input_text' ||
      typeof parts[0].text !== 'string' || parts[0].text.length > 4000) return invalid('invalid attachment prompt');
    for (const part of parts.slice(1)) {
      if (!isRecord(part)) return invalid('invalid attachment part');
      if (part.type === 'input_image') {
        if (!validLocalDataUrl(part.image_url, ['image/jpeg', 'image/png', 'image/webp']) ||
          (part.detail !== 'auto' && part.detail !== 'low' && part.detail !== 'high')) {
          return invalid('invalid image input');
        }
      } else if (part.type === 'input_file') {
        if (!validLocalDataUrl(part.file_data, ['application/pdf']) || typeof part.filename !== 'string' ||
          !/^[^/\\]{1,120}\.pdf$/i.test(part.filename)) return invalid('invalid PDF input');
      } else return invalid('unsupported attachment part');
    }
    const format = isRecord(parsed.text) ? parsed.text.format : undefined;
    if (!isRecord(format) || format.type !== 'json_schema' || format.strict !== true ||
      format.name !== 'kwilt_attachment_inspection' || !isRecord(format.schema)) {
      return invalid('attachment inspection requires strict structured output');
    }
    return { ok: true };
  }

  return { ok: true };
}
