import {
  ASSISTANT_ARTIFACT_RESPONSE_FORMAT,
  parseAssistantArtifactResponse,
} from './assistantArtifact';

describe('assistant draft artifacts', () => {
  test('parses a bounded editable draft alongside the visible answer', () => {
    expect(parseAssistantArtifactResponse(JSON.stringify({
      answer: 'I drafted a message you can edit.',
      artifact: { title: 'School email', kind: 'document', content: 'Hi Ms. Lee,\n\nCould we talk Friday?' },
    }))).toEqual({
      answer: 'I drafted a message you can edit.',
      artifact: { title: 'School email', kind: 'document', content: 'Hi Ms. Lee,\n\nCould we talk Friday?' },
    });
    expect(ASSISTANT_ARTIFACT_RESPONSE_FORMAT).toEqual(expect.objectContaining({
      type: 'json_schema', json_schema: expect.objectContaining({ strict: true }),
    }));
  });

  test('accepts an answer without an artifact and rejects malformed or oversized drafts', () => {
    expect(parseAssistantArtifactResponse(JSON.stringify({ answer: 'Paris is in France.', artifact: null })))
      .toEqual({ answer: 'Paris is in France.', artifact: null });
    expect(parseAssistantArtifactResponse(JSON.stringify({
      answer: 'Drafted.', artifact: { title: 'Email', kind: 'unsupported', content: 'Hello' },
    }))).toBeNull();
    expect(parseAssistantArtifactResponse(JSON.stringify({
      answer: 'Drafted.', artifact: { title: 'Email', kind: 'document', content: 'x'.repeat(20_001) },
    }))).toBeNull();
    expect(parseAssistantArtifactResponse(JSON.stringify({
      answer: 'The email was sent.',
      artifact: { title: 'School email', kind: 'document', content: 'Hello', status: 'sent' },
    }))).toBeNull();
  });
});
