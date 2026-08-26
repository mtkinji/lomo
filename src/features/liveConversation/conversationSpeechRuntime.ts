import { createAudioPlayer } from 'expo-audio';
import { cookVoiceSpeech } from '../../capabilities/recipes/voice/cookVoiceSpeech';
import { getAccessToken } from '../../services/backend/auth';
import { getEdgeFunctionUrl } from '../../services/edgeFunctions';
import { getSupabasePublishableKey } from '../../utils/getEnv';
import { CONVERSATION_PROGRESS_ASSETS } from './conversationProgressAssets';
import { createConversationProgressSpeech } from './conversationProgressSpeech';
import { createLiveConversationSpeech } from './liveConversationSpeech';

// Keep this path available until signed-device proof covers Realtime playback,
// interruption, accessibility routes, and Bluetooth. Realtime sessions do not
// invoke it during normal speech-to-speech operation.
export const liveConversationSpeechFallback = createLiveConversationSpeech({
  getAccessToken,
  getPublishableKey: getSupabasePublishableKey,
  getFunctionUrl: () => getEdgeFunctionUrl('cook-voice-speech'),
  createPlayer: (source, options) => createAudioPlayer(source, options),
  fallback: cookVoiceSpeech,
});

export const conversationProgressSpeech = createConversationProgressSpeech({
  sourceForCue: (cueId) => CONVERSATION_PROGRESS_ASSETS[cueId],
  createPlayer: (source, options) => createAudioPlayer(source, options),
});
