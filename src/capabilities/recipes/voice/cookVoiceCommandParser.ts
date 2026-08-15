import type { ParsedCookVoiceCommand } from './cookVoiceContracts';

const numbers: Record<string, number> = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,fifteen:15,twenty:20,thirty:30,forty:40,fortyfive:45,sixty:60 };
const ordinals: Record<string, number> = { first:1,second:2,third:3,fourth:4,fifth:5 };
function result(normalizedTranscript: string, intent: ParsedCookVoiceCommand['intent'], confidence: ParsedCookVoiceCommand['confidence'] = 'high'): ParsedCookVoiceCommand { return { normalizedTranscript, intent, confidence }; }
function ordinal(text: string): number | null { const match = /\b(first|second|third|fourth|fifth|\d+)(?:st|nd|rd|th)?\b/.exec(text); return match ? ordinals[match[1]] ?? Number(match[1]) : null; }

export function parseCookVoiceCommand(transcript: string): ParsedCookVoiceCommand {
  const normalized = transcript.toLowerCase().trim().replace(/[^a-z0-9?'\s-]/g, ' ').replace(/\s+/g, ' ');
  const text = normalized.replace(/^(?:hey\s+)?(?:kwilt|quilt)\s+/, '');
  if (/\b(don't|do not|not)\b/.test(text)) return result(text, { kind: 'out_of_scope', reason: 'negated' }, 'low');
  if (/ignore (?:all |the )?(?:previous|system)|system prompt|developer message|jailbreak/.test(text)) return result(text, { kind: 'out_of_scope', reason: 'unsafe' }, 'low');
  if (/^(?:what(?:'s| is) next|next(?: step)?|continue|go on)[?]?$/.test(text)) return result(text, { kind: 'advance' });
  if (/^(?:go back|back|previous(?: step)?)[?]?$/.test(text)) return result(text, { kind: 'go_back' });
  if (/^(?:repeat|repeat that|read that again|say that again|what|huh|sorry|come again)[?]?$/.test(text)) return result(text, { kind: 'repeat_current' });
  if (/^(?:where am i|what step am i on|read (?:my |the )?position)[?]?$/.test(text)) return result(text, { kind: 'read_position' });
  if (/^(?:pause cooking|pause session)$/.test(text)) return result(text, { kind: 'pause_session' });
  if (/^(?:resume cooking|resume session)$/.test(text)) return result(text, { kind: 'resume_session' });
  if (/^(?:finish|we(?:'re| are) done|done cooking)$/.test(text)) return result(text, { kind: 'finish' });
  const ingredient = /^(?:how much|read)\s+(.+?)[?]?$/.exec(text); if (ingredient) return result(text, { kind: 'read_ingredient', ingredientQuery: ingredient[1].trim() });
  const timer = /^(?:start|set) (?:a )?(\d+(?:\.\d+)?|[a-z]+)[ -]?(second|minute|hour)s? timer$/.exec(text);
  if (timer) { const amount = numbers[timer[1].replace('-', '')] ?? Number(timer[1]); if (Number.isFinite(amount) && amount > 0) return result(text, { kind: 'start_timer', durationSeconds: Math.round(amount * (timer[2] === 'hour' ? 3600 : timer[2] === 'minute' ? 60 : 1)), label: 'Timer' }); }
  if (/^(?:start|set) (?:a )?timer (?:for|from) (?:this|this step|the current step)$/.test(text)) return result(text, { kind: 'start_suggested_timer' });
  const timerAction = /^(pause|resume|cancel)(?: the)?(?: (first|second|third|fourth|fifth|\d+(?:st|nd|rd|th)?))? timer$/.exec(text);
  if (timerAction) return result(text, { kind: `${timerAction[1]}_timer` as 'pause_timer'|'resume_timer'|'cancel_timer', timerOrdinal: ordinal(timerAction[2] ?? '') });
  if (/^(?:how|what|can|should|is|are|why)\b/.test(text)) return result(text, { kind: 'answer_recipe_question', question: transcript.trim() }, 'medium');
  return result(text, { kind: 'out_of_scope', reason: 'unrecognized' }, 'low');
}
