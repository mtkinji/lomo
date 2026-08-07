import { parseCookVoiceSpeechResponse } from './cookVoiceNaturalSpeechResponse';

describe('parseCookVoiceSpeechResponse', () => {
  it('accepts bounded mp3 audio returned by the authenticated speech endpoint', () => {
    expect(parseCookVoiceSpeechResponse({ audioBase64: 'YWJj', mimeType: 'audio/mpeg' })).toEqual({
      audioBase64: 'YWJj',
      extension: '.mp3',
    });
  });

  it('rejects malformed provider output', () => {
    expect(parseCookVoiceSpeechResponse(null)).toBeNull();
    expect(parseCookVoiceSpeechResponse({ audioBase64: 'not base64!', mimeType: 'audio/mpeg' })).toBeNull();
    expect(parseCookVoiceSpeechResponse({ audioBase64: 'YWJj', mimeType: 'text/plain' })).toBeNull();
  });
});
