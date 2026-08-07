export type CookVoiceState = 'off' | 'listening' | 'thinking' | 'speaking' | 'paused';
export type CookVoiceIntent =
  | { kind: 'advance' | 'go_back' | 'repeat_current' | 'read_position' | 'pause_session' | 'resume_session' | 'finish' }
  | { kind: 'read_ingredient'; ingredientQuery: string }
  | { kind: 'start_timer'; durationSeconds: number; label: string }
  | { kind: 'start_suggested_timer' }
  | { kind: 'pause_timer' | 'resume_timer' | 'cancel_timer'; timerOrdinal: number | null }
  | { kind: 'answer_recipe_question'; question: string }
  | { kind: 'out_of_scope'; reason: 'negated' | 'unsafe' | 'unrecognized' };
export type ParsedCookVoiceCommand = { intent: CookVoiceIntent; confidence: 'high' | 'medium' | 'low'; normalizedTranscript: string };
