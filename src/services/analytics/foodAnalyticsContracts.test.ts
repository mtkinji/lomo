import { AnalyticsEvent } from './events';
import { assertSafeFoodAnalytics, FOOD_ANALYTICS_EVENTS } from './foodAnalyticsContracts';

describe('Food analytics privacy contract',()=>{
 it('covers every Food job transition event',()=>{for(const event of FOOD_ANALYTICS_EVENTS)expect(Object.values(AnalyticsEvent)).toContain(event);});
 it('allows only bounded operational metadata',()=>{expect(assertSafeFoodAnalytics(AnalyticsEvent.CookTimerOutcome,{outcome:'scheduled',duration_bucket:'5_to_15m',proof_level:'simulator'})).toEqual(expect.any(Object));});
 it.each(['title','recipe_text','ingredient','source_url','transcript','audio','coupon_token','retailer_credentials','private_response','amount_cents'])('rejects private field %s',(key)=>{expect(()=>assertSafeFoodAnalytics(AnalyticsEvent.RecipeHomeViewed,{[key]:'secret'})).toThrow('food_analytics.private_field');});
 it('allows aggregate import warning counts',()=>{expect(assertSafeFoodAnalytics(AnalyticsEvent.RecipeImportDraftCreated,{method:'photo',warning_count:2})).toEqual({method:'photo',warning_count:2});});
});
