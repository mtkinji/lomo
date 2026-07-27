import { readFileSync } from 'node:fs';
import path from 'node:path';

const voiceSource = readFileSync(path.resolve(__dirname, 'unifiedChatVoice.ts'), 'utf8');

describe('Unified Chat native voice recording contract', () => {
  test('streams normalized live microphone levels at a responsive interval', () => {
    expect(voiceSource).toContain('candidate.setProgressUpdateInterval(100)');
    expect(voiceSource).toContain('candidate.setOnRecordingStatusUpdate((status) =>');
    expect(voiceSource).toContain("typeof status.metering !== 'number'");
    expect(voiceSource).toContain('onLevel?.(normalizeUnifiedChatVoiceMetering(status.metering))');
  });

  test('detaches metering updates before stopping or cancelling', () => {
    expect(voiceSource.match(/setOnRecordingStatusUpdate\(null\)/g)).toHaveLength(3);
  });
});
