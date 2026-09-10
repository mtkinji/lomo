import { homeFeedItemExamples, homeFeedReviewTypes } from './homeFeedItemExamples';
import type { HomeAttachment, HomePost } from '../shared-home/sharedLifeTypes';
import type { SharedHomeDelivery, SharedHomeState } from '../shared-home/sharedHomeTypes';
const attachmentKinds: Record<HomeAttachment['kind'], true> = {place:true, outing:true, goal_completed:true};
const eventKinds: Record<SharedHomeDelivery['eventKind'], true> = {goal_note:true, goal_checkin:true, goal_invitation:true, game_turn:true, meal_choice_round:true};
const states: Record<SharedHomeState, true> = {pending:true, available:true, settled:true, expired:true, unavailable:true};
const postKinds: Record<NonNullable<HomePost['kind']>, true> = {moment:true, chore_update:true};
it('covers every supported semantic type and at least three variants per review group', () => {
 expect(new Set(homeFeedItemExamples.map(e=>e.id)).size).toBe(homeFeedItemExamples.length);
 expect(homeFeedReviewTypes).toHaveLength(11);
 for (const type of homeFeedReviewTypes) expect(homeFeedItemExamples.filter(e=>e.typeId===type.id).length).toBeGreaterThanOrEqual(3);
 for (const kind of Object.keys(attachmentKinds)) expect(homeFeedItemExamples.some(e=>e.post?.attachment?.kind===kind)).toBe(true);
 for (const kind of Object.keys(postKinds)) expect(homeFeedItemExamples.some(e=>(e.post?.kind ?? (e.post?'moment':null))===kind)).toBe(true);
 for (const kind of Object.keys(eventKinds)) for (const state of Object.keys(states)) expect(homeFeedItemExamples.some(e=>e.delivery?.eventKind===kind && e.delivery.state===state)).toBe(true);
});
it('keeps each fixture in exactly one valid family and source destination', () => {
 for (const e of homeFeedItemExamples) {
  expect(homeFeedReviewTypes.some(t=>t.id===e.typeId)).toBe(true);
  expect(Boolean(e.post)!==Boolean(e.delivery)).toBe(true);
  if(e.delivery){const d=e.delivery;const expected=d.eventKind==='game_turn'?'game_room':d.eventKind==='meal_choice_round'?'meal_choice':d.eventKind==='goal_invitation'?'goal_invite':'goal';expect(d.destination.kind).toBe(expected);}
 }
});
it('includes meaningful media, audience, response and chore states', () => {
 const posts=homeFeedItemExamples.flatMap(e=>e.post?[e.post]:[]);
 expect(new Set(posts.map(p=>p.audience))).toEqual(new Set(['household','people','followers']));
 expect(posts.some(p=>p.media.length===4)).toBe(true);
 expect(posts.some(p=>p.saved && p.myReaction)).toBe(true);
 expect(posts.some(p=>p.savedToExplore)).toBe(true);
 expect(posts.some(p=>p.text.length>500)).toBe(true);
 expect(posts.some(p=>p.choreUpdate?.items.every(i=>i.state==='waiting_approval'))).toBe(true);
 expect(posts.some(p=>p.choreUpdate?.items.some(i=>i.reportedEarlier))).toBe(true);
});
