import {
  applyUnifiedChatAttachmentInspection,
  buildUnifiedChatAttachmentInspectionRequest,
  parseUnifiedChatAttachmentInspectionResponse,
} from './unifiedChatAttachmentInspection';

const image = {
  id: 'image-1', name: 'schedule.png', mimeType: 'image/png', sizeBytes: 3,
  kind: 'image' as const, status: 'inspecting' as const, content: '',
  dataUrl: 'data:image/png;base64,YWJj',
};
const pdf = {
  id: 'pdf-1', name: 'brief.pdf', mimeType: 'application/pdf', sizeBytes: 3,
  kind: 'pdf' as const, status: 'inspecting' as const, content: '',
  dataUrl: 'data:application/pdf;base64,YWJj',
};

describe('Unified Chat attachment inspection', () => {
  test('builds one stored-off mixed image/PDF Responses request', () => {
    const request = buildUnifiedChatAttachmentInspectionRequest([image, pdf]);
    expect(request).toEqual(expect.objectContaining({ store: false }));
    expect(request.input[0].content).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'input_image', image_url: image.dataUrl }),
      expect.objectContaining({ type: 'input_file', file_data: pdf.dataUrl, filename: 'brief.pdf' }),
    ]));
    expect(request.text).toEqual(expect.objectContaining({
      format: expect.objectContaining({ type: 'json_schema', strict: true }),
    }));
    expect(request.text.format.schema.properties.attachments.items.properties.id).toEqual({
      type: 'string',
      enum: ['image-1', 'pdf-1'],
    });
    expect(JSON.stringify(request)).not.toContain('http');
  });

  test('parses strict per-file coverage from output text', () => {
    const parsed = parseUnifiedChatAttachmentInspectionResponse({
      output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({
        attachments: [
          { id: 'image-1', status: 'ready', observations: 'Monday: dentist at 9.', limitation: null },
          { id: 'pdf-1', status: 'partial', observations: 'Pages 1-2 describe the launch.', limitation: 'Page 3 was unreadable.' },
        ],
      }) }] }],
    });
    expect(parsed).toEqual([
      { id: 'image-1', status: 'ready', content: 'Monday: dentist at 9.' },
      { id: 'pdf-1', status: 'partial', content: 'Pages 1-2 describe the launch.', failureReason: 'Page 3 was unreadable.' },
    ]);
  });

  test('turns missing or malformed per-file coverage into an explicit failed draft', () => {
    const inspected = applyUnifiedChatAttachmentInspection([image, pdf], [
      { id: 'image-1', status: 'ready', content: 'Monday: dentist at 9.' },
    ]);
    expect(inspected[0]).toEqual(expect.objectContaining({ status: 'ready' }));
    expect(inspected[0]).not.toHaveProperty('dataUrl');
    expect(inspected[1]).toEqual(expect.objectContaining({
      status: 'failed', failureReason: 'Kwilt did not receive an inspection result for this PDF.',
    }));
    expect(() => parseUnifiedChatAttachmentInspectionResponse({ output_text: '{"attachments":[]}' }))
      .toThrow('inspection response');
  });
});
