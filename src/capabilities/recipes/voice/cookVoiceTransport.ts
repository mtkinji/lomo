import { cancelUnifiedChatVoiceRecording, startUnifiedChatVoiceRecording, stopAndTranscribeUnifiedChatVoice } from '../../../features/unifiedChat/unifiedChatVoice';

export const cookVoiceTransport = {
  start: startUnifiedChatVoiceRecording,
  stopAndTranscribe: stopAndTranscribeUnifiedChatVoice,
  cancel: cancelUnifiedChatVoiceRecording,
};
