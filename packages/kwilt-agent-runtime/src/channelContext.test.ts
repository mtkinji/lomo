import { buildKwiltChannelContext } from './channelContext';

describe('versioned Kwilt channel context', () => {
  test('bounds UI state and never forwards raw attachment contents', () => {
    const packet = buildKwiltChannelContext({
      locale: 'en-US', timeZone: 'America/Denver', appState: 'active',
      origin: { screen: 'UnifiedChat', action: 'run.retry' },
      selectedEntities: Array.from({ length: 10 }, (_, index) => ({
        capabilityId: 'todos', objectType: 'activity', objectId: `activity-${index}`, label: `Activity ${index}`,
      })),
      attachments: [{
        id: 'attachment-1', name: 'schedule.png', mimeType: 'image/png', sizeBytes: 1200,
        content: 'private inspection text', dataUrl: 'data:image/png;base64,abc',
      }],
      pendingProposalIds: ['proposal-1'], pendingClientActionIds: ['action-1'],
      availableDeviceProviders: Array.from({ length: 30 }, (_, index) => `provider-${index}`),
      voice: {
        sessionId: 'conversation-1', utteranceId: 'item-1', source: 'provider_final',
        locale: 'en-US', interrupted: true, speechStoppedAt: '2026-08-26T18:00:00.000Z',
        finalizedAt: '2026-08-26T18:00:00.500Z',
      },
    });

    expect(packet).toMatchObject({
      schemaVersion: 1, locale: 'en-US', timeZone: 'America/Denver', appState: 'foreground',
      origin: { screen: 'UnifiedChat', action: 'run.retry' },
      pendingWork: { proposalIds: ['proposal-1'], clientActionIds: ['action-1'] },
      voice: {
        sessionId: 'conversation-1', utteranceId: 'item-1', source: 'provider_final',
        locale: 'en-US', interrupted: true, speechStoppedAt: '2026-08-26T18:00:00.000Z',
        finalizedAt: '2026-08-26T18:00:00.500Z',
      },
    });
    expect(packet.selectedEntities).toHaveLength(8);
    expect(packet.availableDeviceProviders).toHaveLength(16);
    expect(packet.attachments).toEqual([{
      attachmentId: 'attachment-1', name: 'schedule.png', mimeType: 'image/png',
      sizeBytes: 1200, objectPath: null,
    }]);
    expect(JSON.stringify(packet)).not.toMatch(/private inspection text|base64/);
  });
});
