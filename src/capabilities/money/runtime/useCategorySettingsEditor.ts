import { useEffect, useRef, useState } from 'react';
import type { MoneyCategory } from '../data/moneySnapshot';
import { UNKNOWN_CATEGORY_SAVE, type CategorySettingsOutcome, type CategorySettingsRequest } from '../domain/categorySettingsCommand';

type Input = {
  open: boolean;
  actorUserId: string | null;
  category: MoneyCategory | undefined;
  loadPending: (categoryId: string) => Promise<CategorySettingsRequest | null>;
  save: (request: CategorySettingsRequest) => Promise<CategorySettingsOutcome>;
  onReady: (baseline: MoneyCategory, pending: CategorySettingsRequest | null) => void;
};
type EditorState = {
  key: string;
  phase: 'loading' | 'ready' | 'saving' | 'load_error';
  baseline: MoneyCategory | null;
  pending: CategorySettingsRequest | null;
  error: string | null;
};
type Prepare = (baseline: MoneyCategory, actorUserId: string) => Promise<CategorySettingsRequest>;

export function useCategorySettingsEditor(input: Input) {
  const [reload, setReload] = useState(0);
  const key = JSON.stringify([input.open, input.actorUserId, input.category?.sourceId, reload]);
  const latest = useRef(input); latest.current = input;
  const currentKey = useRef(key); currentKey.current = key;
  const epoch = useRef(0);
  const submitting = useRef<number | null>(null);
  const [state, setState] = useState<EditorState>({ key: '', phase: 'loading', baseline: null, pending: null, error: null });

  useEffect(() => {
    const generation = ++epoch.current;
    const isCurrent = () => epoch.current === generation && currentKey.current === key;
    const baseline = latest.current.category;
    submitting.current = null;
    setState({ key, phase: 'loading', baseline: baseline ?? null, pending: null, error: null });
    if (latest.current.open) {
      if (!baseline || !latest.current.actorUserId) {
        setState({ key, phase: 'load_error', baseline: baseline ?? null, pending: null, error: 'Sign in and reload this category before changing settings.' });
      } else {
        void latest.current.loadPending(baseline.sourceId).then((pending) => {
          if (!isCurrent()) return;
          if (pending && (pending.actorUserId !== latest.current.actorUserId || pending.categoryId !== baseline.sourceId)) {
            throw new Error('The pending save belongs to another account or category.');
          }
          latest.current.onReady(baseline, pending);
          setState({ key, phase: 'ready', baseline, pending, error: pending ? UNKNOWN_CATEGORY_SAVE : null });
        }).catch((error: unknown) => {
          if (isCurrent()) setState({ key, phase: 'load_error', baseline, pending: null,
            error: error instanceof Error ? error.message : 'The pending save could not be checked. Try again.' });
        });
      }
    }
    return () => { epoch.current += 1; };
  }, [key]);

  async function submit(prepare: Prepare): Promise<CategorySettingsOutcome | null> {
    if (!input.open || !input.actorUserId || state.key !== key || state.phase !== 'ready' || !state.baseline || submitting.current !== null) return null;
    const generation = epoch.current;
    const isCurrent = () => epoch.current === generation && currentKey.current === key;
    submitting.current = generation;
    setState((current) => ({ ...current, phase: 'saving', error: null }));
    let pending = state.pending;
    try {
      pending = pending ?? await prepare(state.baseline, input.actorUserId);
      if (!isCurrent()) return null;
      setState((current) => ({ ...current, pending }));
      const result = await input.save(pending);
      if (!isCurrent()) return null;
      setState((current) => ({ ...current, phase: 'ready',
        pending: result.outcome === 'unknown' ? pending : null,
        error: result.outcome === 'confirmed' ? null : result.message }));
      return result;
    } catch (error) {
      if (isCurrent()) setState((current) => ({ ...current, phase: 'ready', pending,
        error: error instanceof Error ? error.message : 'The category could not be saved.' }));
      return null;
    } finally {
      if (submitting.current === generation) submitting.current = null;
    }
  }
  return { ...state, phase: state.key === key ? state.phase : 'loading' as const,
    submit, retryLoad: () => setReload((value) => value + 1) };
}
