import { parseCookVoiceCommand } from './cookVoiceCommandParser';

export type CookVoiceControllerAction =
  | { type: 'next' | 'back' | 'pause' | 'resume' | 'finish' }
  | { type: 'repeat' | 'read_position'; ingredientQuery?: string }
  | { type: 'start_timer'; durationSeconds: number; label: string }
  | { type: 'start_suggested_timer' }
  | { type: 'pause_timer' | 'resume_timer' | 'cancel_timer'; timerOrdinal: number | null };

export function createCookVoiceController(input: { execute(action: CookVoiceControllerAction): void; now(): number }) {
  let last: { transcript: string; at: number } | null = null;
  return { handle(transcript: string, context: { hasActiveSession: boolean }) {
    const parsed = parseCookVoiceCommand(transcript); const now = input.now();
    if (last?.transcript === parsed.normalizedTranscript && now - last.at < 3000) return { state: 'duplicate' as const, parsed, acknowledgement: null };
    last = { transcript: parsed.normalizedTranscript, at: now };
    if (!context.hasActiveSession) return { state: 'no_session' as const, parsed, acknowledgement: 'Open a Cook Session first.' };
    const intent = parsed.intent;
    if (intent.kind === 'out_of_scope') return { state: 'not_handled' as const, parsed, acknowledgement: 'I can help with this recipe and Cook Mode controls.' };
    if (intent.kind === 'answer_recipe_question') return { state: 'needs_grounded_answer' as const, parsed, acknowledgement: null };
    let action: CookVoiceControllerAction;
    switch (intent.kind) {
      case 'advance': action = { type: 'next' }; break;
      case 'go_back': action = { type: 'back' }; break;
      case 'repeat_current': action = { type: 'repeat' }; break;
      case 'read_position': action = { type: 'read_position' }; break;
      case 'read_ingredient': action = { type: 'repeat', ingredientQuery: intent.ingredientQuery }; break;
      case 'pause_session': action = { type: 'pause' }; break;
      case 'resume_session': action = { type: 'resume' }; break;
      case 'finish': action = { type: 'finish' }; break;
      case 'start_timer': action = { type: 'start_timer', durationSeconds: intent.durationSeconds, label: intent.label }; break;
      case 'start_suggested_timer': action = { type: 'start_suggested_timer' }; break;
      case 'pause_timer': case 'resume_timer': case 'cancel_timer': action = { type: intent.kind, timerOrdinal: intent.timerOrdinal }; break;
      default: return { state: 'not_handled' as const, parsed, acknowledgement: null };
    }
    input.execute(action);
    const acknowledgement = action.type === 'next' ? 'Next action.' : action.type === 'back' ? 'Previous action.' : action.type === 'start_timer' ? 'Timer started.' : null;
    return { state: 'handled' as const, parsed, acknowledgement };
  } };
}
