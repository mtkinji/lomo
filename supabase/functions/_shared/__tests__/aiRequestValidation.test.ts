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

describe('Kwilt AI request validation', () => {
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
});
