import {
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  type MediaStream,
} from 'react-native-webrtc';
import { getAccessToken } from '../../services/backend/auth';
import { getEdgeFunctionUrl, getEdgeFunctionUrlCandidates } from '../../services/edgeFunctions';
import { getInstallId } from '../../services/installId';
import { getSupabasePublishableKey } from '../../utils/getEnv';
import {
  parseOpenAiRealtimeEvent,
  type LiveConversationProviderEvent,
} from './openAiRealtimeEvents';
import { waitForLiveConversationDataChannel } from './liveConversationConnection';
import {
  buildRealtimeToolResultEvents,
  createDurableRealtimeTool,
  type DurableRealtimeRunRequest,
  type DurableRealtimeToolResult,
} from './durableRealtimeTool';

type EphemeralSession = { clientSecret: string };

async function requestEphemeralSession(locale?: string): Promise<EphemeralSession> {
  const token = (await getAccessToken())?.trim();
  const apiKey = getSupabasePublishableKey()?.trim();
  if (!token || !apiKey) throw new Error('Sign in to start a conversation.');
  const headers = new Headers({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    apikey: apiKey,
    'x-kwilt-client': 'kwilt-mobile',
    'x-kwilt-install-id': await getInstallId(),
  });
  const candidates = getEdgeFunctionUrlCandidates('live-conversation-session');
  const fallback = getEdgeFunctionUrl('live-conversation-session');
  let lastError = new Error('Conversation mode is unavailable.');
  for (const url of candidates.length ? candidates : fallback ? [fallback] : []) {
    try {
      const response = await fetch(url, {
        method: 'POST', headers, body: JSON.stringify({ channel: 'chat', ...(locale ? { locale } : {}) }),
      });
      const body = await response.json().catch(() => null) as Record<string, unknown> | null;
      if (response.ok && typeof body?.clientSecret === 'string') {
        return { clientSecret: body.clientSecret };
      }
      const error = body?.error && typeof body.error === 'object' ? body.error as Record<string, unknown> : null;
      if (error?.diagnostic && typeof error.diagnostic === 'object') {
        console.warn('[live-conversation] Provider session rejected', error.diagnostic);
      }
      lastError = new Error(typeof error?.message === 'string' ? error.message : lastError.message);
      if (response.status !== 404) break;
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;
    }
  }
  throw lastError;
}

export type LiveConversationConnection = {
  sessionId: string;
  usesRealtimeSpeech: true;
  stop: () => Promise<void>;
  cancelResponse(): void;
  setMicrophoneEnabled(enabled: boolean): void;
};

export async function startLiveConversationSession(input: {
  locale?: string;
  onConnected: (connection: LiveConversationConnection) => void;
  onEvent: (event: LiveConversationProviderEvent) => void;
  onDurableRun: (request: DurableRealtimeRunRequest) => Promise<DurableRealtimeToolResult>;
  onFailure: (error: Error) => void;
}): Promise<LiveConversationConnection> {
  const session = await requestEphemeralSession(input.locale);
  const sessionId = `live-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const peer = new RTCPeerConnection();
  let stream: MediaStream | null = null;
  let stopped = false;
  let events: ReturnType<RTCPeerConnection['createDataChannel']> | null = null;
  const durableTool = createDurableRealtimeTool({ run: input.onDurableRun });
  const handledToolCallIds = new Set<string>();
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    durableTool.reset();
    handledToolCallIds.clear();
    peer.close();
  };
  const connection: LiveConversationConnection = {
    sessionId,
    usesRealtimeSpeech: true,
    stop,
    cancelResponse() {
      if (events?.readyState === 'open') events.send(JSON.stringify({ type: 'response.cancel' }));
    },
    setMicrophoneEnabled(enabled) {
      stream?.getAudioTracks().forEach((track) => { track.enabled = enabled; });
    },
  };
  try {
    stream = await mediaDevices.getUserMedia({ audio: true, video: false });
    stream.getTracks().forEach((track) => peer.addTrack(track, stream!));
    events = peer.createDataChannel('oai-events');
    events.onmessage = (message: { data: unknown }) => {
      if (typeof message.data !== 'string') return;
      const event = parseOpenAiRealtimeEvent(message.data);
      if (!event) return;
      if (event.type === 'transcript_final') {
        durableTool.observeFinalTranscript({ itemId: event.itemId, transcript: event.transcript });
      }
      if (event.type === 'tool_call') {
        if (handledToolCallIds.has(event.callId)) return;
        handledToolCallIds.add(event.callId);
        void durableTool.execute(event).then((result) => {
          if (events?.readyState !== 'open') return;
          buildRealtimeToolResultEvents(event.callId, result)
            .forEach((payload) => events?.send(JSON.stringify(payload)));
        }).catch(() => input.onFailure(new Error('Conversation action bridge interrupted.')));
      }
      input.onEvent(event);
    };
    events.onerror = () => input.onFailure(new Error('Conversation connection interrupted.'));
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.clientSecret}`, 'Content-Type': 'application/sdp' },
      body: offer.sdp,
    });
    const answer = await response.text();
    if (!response.ok || !answer.trim()) throw new Error('Conversation connection could not be established.');
    await peer.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answer }));
    await waitForLiveConversationDataChannel(events);
    events.onerror = () => input.onFailure(new Error('Conversation connection interrupted.'));
    input.onConnected(connection);
    return connection;
  } catch (error) {
    await stop();
    throw error;
  }
}
