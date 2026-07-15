export type QuickAddAiActionPreference = 'steps' | 'triggers' | 'details' | 'cover_image';

export const DEFAULT_QUICK_ADD_AI_ACTIONS: QuickAddAiActionPreference[] = ['steps', 'triggers', 'details'];

const QUICK_ADD_AI_ACTION_ORDER: QuickAddAiActionPreference[] = [
  'steps',
  'triggers',
  'details',
  'cover_image',
];
const QUICK_ADD_AI_ACTION_SET = new Set<QuickAddAiActionPreference>(QUICK_ADD_AI_ACTION_ORDER);

export function normalizeQuickAddAiActionPreferences(
  actions: unknown,
  options: { fallbackToDefault: boolean } = { fallbackToDefault: true },
): QuickAddAiActionPreference[] {
  if (!Array.isArray(actions)) {
    return options.fallbackToDefault ? [...DEFAULT_QUICK_ADD_AI_ACTIONS] : [];
  }

  const selected = new Set<QuickAddAiActionPreference>();
  actions.forEach((action) => {
    if (typeof action !== 'string') return;
    if (!QUICK_ADD_AI_ACTION_SET.has(action as QuickAddAiActionPreference)) return;
    selected.add(action as QuickAddAiActionPreference);
  });

  return QUICK_ADD_AI_ACTION_ORDER.filter((action) => selected.has(action));
}
