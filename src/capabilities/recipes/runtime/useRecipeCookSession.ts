import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as KeepAwake from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

import { useAppStore } from '../../../store/useAppStore';
import type { RecipeProjection } from '../data/recipeCache';
import { createRecipeCookRepository } from '../data/recipeCookRepository';
import { buildRecipeCookCues } from '../domain/recipeCookCueBuilder';
import { reconcileRecipeCookSessionCues } from '../domain/recipeCookSessionCueMigration';
import { createRecipeCookSession, transitionRecipeCookSession, type RecipeCookCommand, type RecipeCookEvent } from '../domain/recipeCookStateMachine';
import type { CookCue, RecipeCookSession } from '../domain/recipeCookContracts';

const KEEP_AWAKE_TAG = 'kwilt-recipe-cook';
export function useRecipeCookSession(recipe: RecipeProjection, servings: number) {
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const cues = useMemo(() => buildRecipeCookCues(recipe.currentVersion, {
    servings,
    mediaAssets: recipe.recipe.mediaAssets,
  }), [recipe, servings]);
  const [session, setSession] = useState<RecipeCookSession | null>(null);
  const [restoring, setRestoring] = useState(true);
  const repository = useMemo(() => createRecipeCookRepository(), []);
  useEffect(() => { let alive = true; void (async () => { const cached = userId ? await repository.readActive(userId) : null; if (alive && cached?.recipeVersionId === recipe.currentVersion.id && ['active','paused'].includes(cached.status)) { const reconciled = reconcileRecipeCookSessionCues(cached, cues, new Date().toISOString()); setSession(reconciled); if (reconciled !== cached && userId) await repository.save(userId, reconciled).catch(() => undefined); } if (alive) setRestoring(false); })(); return () => { alive = false; }; }, [cues, recipe.currentVersion.id, repository, userId]);
  useEffect(() => {
    const update = (state: string) => { if (session?.status === 'active' && state === 'active') void KeepAwake.activateKeepAwakeAsync(KEEP_AWAKE_TAG); else void KeepAwake.deactivateKeepAwake(KEEP_AWAKE_TAG); };
    update(AppState.currentState); const subscription = AppState.addEventListener('change', update); return () => { subscription.remove(); void KeepAwake.deactivateKeepAwake(KEEP_AWAKE_TAG); };
  }, [session?.status]);
  const persist = useCallback(async (next: RecipeCookSession) => { setSession(next); if (userId) await repository.save(userId, next); }, [repository, userId]);
  const start = useCallback(async () => {
    if (session) return session;
    const now = new Date().toISOString(); const next = createRecipeCookSession({ id: Crypto.randomUUID(), ownerPersonId: recipe.recipe.ownerPersonId, recipeId: recipe.recipe.id, recipeVersionId: recipe.currentVersion.id, recipeVersion: recipe.currentVersion.version, servingScale: servings / (recipe.currentVersion.yieldQuantity ?? servings), cueCount: Math.max(1, cues.length), now, device: { deviceId: userId ?? 'local-device', platform: Platform.OS === 'android' ? 'android' : 'ios', appVersion: Application.nativeApplicationVersion ?? 'development' } });
    await persist(next); return next;
  }, [cues.length, persist, recipe, servings, session, userId]);
  const send = useCallback(async (event: RecipeCookCommand) => { if (!session) throw new Error('Cook Session is not ready.');let command:RecipeCookCommand=event;let scheduled:string|null=null;if(event.type==='resume_timer'){const timer=session.timers.find((item)=>item.id===event.timerId);if(timer){const permission=await Notifications.getPermissionsAsync();if(permission.status==='granted')scheduled=await Notifications.scheduleNotificationAsync({content:{title:`${timer.label} timer`,body:`${recipe.currentVersion.title} is ready for the next action.`,data:{capability:'food',recipeId:recipe.recipe.id,cookSessionId:session.id}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(Date.now()+timer.remainingSeconds*1000)}});command={...event,notificationId:scheduled};}}let next:RecipeCookSession;try{next=transitionRecipeCookSession(session,{...command,expectedRevision:session.revision,now:new Date().toISOString()}as RecipeCookEvent);}catch(error){if(scheduled)await Notifications.cancelScheduledNotificationAsync(scheduled).catch(()=>undefined);throw error;}await persist(next);if((event.type==='pause_timer'||event.type==='cancel_timer')){const previous=session.timers.find((item)=>item.id===event.timerId)?.notificationId;if(previous)await Notifications.cancelScheduledNotificationAsync(previous).catch(()=>undefined);}return next; }, [persist, recipe.currentVersion.title, recipe.recipe.id, session]);
  const startTimer = useCallback(async (suggestion: CookCue['timerSuggestions'][number]) => {
    if (!session) return; let notificationId: string | null = null;
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status === 'granted') notificationId = await Notifications.scheduleNotificationAsync({ content: { title: `${suggestion.label} timer`, body: `${recipe.currentVersion.title} is ready for the next action.`, data: { capability: 'food', recipeId: recipe.recipe.id, cookSessionId: session.id } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + suggestion.durationSeconds * 1000) } });
    await send({ type: 'start_timer', cueId: cues[session.currentCueIndex]?.id ?? 'cue:unknown', timerId: Crypto.randomUUID(), durationSeconds: suggestion.durationSeconds, label: suggestion.label, notificationId });
  }, [cues, recipe, send, session]);
  return { session, cues, restoring, start, send, startTimer };
}
