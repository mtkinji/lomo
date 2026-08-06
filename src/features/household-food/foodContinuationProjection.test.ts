import { deriveFoodContinuation } from './foodContinuationProjection';

describe('Food continuation', () => {
  it('prioritizes an active cook session over planning and shopping', () => {
    expect(deriveFoodContinuation({ activeCook: { recipeId: 'r', servings: 4, cueIndex: 2 }, plans: [{ id: 'p', version: 2, state: 'finalized' }], groceryLists: [{ id: 'g', revision: 1, status: 'ready', sourceMealPlanId: 'p', sourceMealPlanVersion: 2 }] })).toEqual(expect.objectContaining({ kind: 'resume_cooking', route: 'RecipeCookMode' }));
  });
  it('continues review, shopping, compilation, family input, finalization, then planning', () => {
    expect(deriveFoodContinuation({ activeCook:null,plans:[],groceryLists:[{id:'g',revision:1,status:'review_needed',sourceMealPlanId:'p',sourceMealPlanVersion:1}]}).kind).toBe('review_groceries');
    expect(deriveFoodContinuation({ activeCook:null,plans:[{id:'p',version:2,state:'collecting_choices'}],groceryLists:[]}).kind).toBe('review_choices');
    expect(deriveFoodContinuation({ activeCook:null,plans:[{id:'p',version:2,state:'ready_to_finalize'}],groceryLists:[]}).kind).toBe('finalize');
    expect(deriveFoodContinuation({ activeCook:null,plans:[],groceryLists:[]}).kind).toBe('plan_next_shop');
  });
});
