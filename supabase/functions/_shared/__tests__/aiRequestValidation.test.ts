import { validateKwiltAiRequestShape } from '../aiRequestValidation';

const validAttachmentRequest = {
  store: false,
  input: [{ role: 'user', content: [
    { type: 'input_text', text: 'Inspect id=image-1' },
    { type: 'input_image', image_url: 'data:image/png;base64,YWJj', detail: 'auto' },
    { type: 'input_file', file_data: 'data:application/pdf;base64,YWJj', filename: 'brief.pdf' },
  ] }],
  text: { format: { type: 'json_schema', strict: true, name: 'kwilt_attachment_inspection', schema: {} } },
};

const validAgentJudgmentRequest = {
  model: 'gpt-5.6-luna',
  store: false,
  reasoning: { effort: 'low' },
  max_output_tokens: 800,
  input: [{ role: 'user', content: 'Bounded agent judgment prompt' }],
  text: {
    format: {
      type: 'json_schema',
      name: 'kwilt_agent_judgment',
      strict: true,
      schema: { type: 'object', additionalProperties: false, properties: {}, required: [] },
    },
  },
};

describe('Kwilt AI request validation', () => {
  test('allows streaming only for plain chat completions', () => {
    const plain = { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hello' }], stream: true };
    expect(validateKwiltAiRequestShape('/v1/chat/completions', plain, 'default_chat'))
      .toEqual({ ok: true });
    expect(validateKwiltAiRequestShape('/v1/chat/completions', {
      ...plain, tools: [{ type: 'function', function: { name: 'test' } }],
    }, 'default_chat')).toEqual(expect.objectContaining({ ok: false }));
    expect(validateKwiltAiRequestShape('/v1/chat/completions', {
      ...plain, response_format: { type: 'json_schema' },
    }, 'default_chat')).toEqual(expect.objectContaining({ ok: false }));
  });

  test('accepts only bounded local image/PDF parts for attachment inspection', () => {
    expect(validateKwiltAiRequestShape('/v1/responses', validAttachmentRequest, 'unified_chat_attachment'))
      .toEqual({ ok: true });
    expect(validateKwiltAiRequestShape('/v1/responses', {
      ...validAttachmentRequest,
      input: [{ role: 'user', content: [{ type: 'input_image', image_url: 'https://example.com/private.png' }] }],
    }, 'unified_chat_attachment')).toEqual(expect.objectContaining({ ok: false }));
    expect(validateKwiltAiRequestShape('/v1/responses', {
      ...validAttachmentRequest, tools: [{ type: 'web_search' }],
    }, 'unified_chat_attachment')).toEqual(expect.objectContaining({ ok: false }));
    expect(validateKwiltAiRequestShape('/v1/responses', {
      ...validAttachmentRequest, store: true,
    }, 'unified_chat_attachment')).toEqual(expect.objectContaining({ ok: false }));
  });

  test('keeps hosted web search separate from multimodal inspection', () => {
    expect(validateKwiltAiRequestShape('/v1/responses', {
      store: false, input: [{ role: 'user', content: 'latest weather' }], tools: [{ type: 'web_search' }],
    }, 'current_information')).toEqual({ ok: true });
    expect(validateKwiltAiRequestShape('/v1/responses', validAttachmentRequest, 'current_information'))
      .toEqual(expect.objectContaining({ ok: false }));
  });

  test('accepts only bounded low-reasoning agent judgment requests', () => {
    expect(validateKwiltAiRequestShape('/v1/responses', validAgentJudgmentRequest, 'agent_judgment'))
      .toEqual({ ok: true });

    const rejected = [
      { ...validAgentJudgmentRequest, model: 'gpt-5.6-terra' },
      { ...validAgentJudgmentRequest, store: true },
      { ...validAgentJudgmentRequest, background: true },
      { ...validAgentJudgmentRequest, tools: [] },
      { ...validAgentJudgmentRequest, input: Array.from({ length: 3 }, () => ({ role: 'user', content: 'x' })) },
      { ...validAgentJudgmentRequest, input: [{ role: 'user', content: 'x'.repeat(12_001) }] },
      { ...validAgentJudgmentRequest, reasoning: { effort: 'medium' } },
      { ...validAgentJudgmentRequest, max_output_tokens: 801 },
      {
        ...validAgentJudgmentRequest,
        text: { format: { ...validAgentJudgmentRequest.text.format, name: 'other_format' } },
      },
      {
        ...validAgentJudgmentRequest,
        text: { format: { ...validAgentJudgmentRequest.text.format, strict: false } },
      },
    ];

    for (const request of rejected) {
      expect(validateKwiltAiRequestShape('/v1/responses', request, 'agent_judgment'))
        .toEqual(expect.objectContaining({ ok: false }));
    }
  });
});
