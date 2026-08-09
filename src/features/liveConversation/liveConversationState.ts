export type LiveConversationPhase =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'recovering'
  | 'unavailable';

export type LiveConversationState = {
  phase: LiveConversationPhase;
  provisionalTranscript: string;
  elapsedSeconds: number;
  message?: string;
};

export type LiveConversationAction =
  | { type: 'start' }
  | { type: 'connected' }
  | { type: 'speech_started' }
  | { type: 'transcript_delta'; delta: string }
  | { type: 'transcript_finalized' }
  | { type: 'thinking' }
  | { type: 'speaking' }
  | { type: 'interrupted' }
  | { type: 'tick' }
  | { type: 'recover'; message?: string }
  | { type: 'fail'; message: string }
  | { type: 'stop' };

export const INITIAL_LIVE_CONVERSATION_STATE: LiveConversationState = {
  phase: 'idle',
  provisionalTranscript: '',
  elapsedSeconds: 0,
};

export function reduceLiveConversationState(
  state: LiveConversationState,
  action: LiveConversationAction,
): LiveConversationState {
  switch (action.type) {
    case 'start':
      return { phase: 'connecting', provisionalTranscript: '', elapsedSeconds: 0 };
    case 'connected':
    case 'speech_started':
      return { ...state, phase: 'listening', ...(action.type === 'speech_started' ? { provisionalTranscript: '' } : {}) };
    case 'transcript_delta':
      return { ...state, phase: 'listening', provisionalTranscript: `${state.provisionalTranscript}${action.delta}` };
    case 'transcript_finalized':
    case 'thinking':
      return { ...state, phase: 'thinking', provisionalTranscript: '' };
    case 'speaking':
      return { ...state, phase: 'speaking' };
    case 'interrupted':
      return { ...state, phase: 'interrupted' };
    case 'tick':
      return state.phase === 'idle' || state.phase === 'unavailable'
        ? state
        : { ...state, elapsedSeconds: state.elapsedSeconds + 1 };
    case 'recover':
      return { ...state, phase: 'recovering', message: action.message };
    case 'fail':
      return { ...state, phase: 'unavailable', provisionalTranscript: '', message: action.message };
    case 'stop':
      return INITIAL_LIVE_CONVERSATION_STATE;
  }
}
