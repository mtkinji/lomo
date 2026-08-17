import { createFoodCapabilityAdapters } from './foodCapabilityAdapters';

describe('Food capability adapters', () => {
  it('delegates to the capability owner and returns a versioned receipt', async () => {
    const execute = jest.fn().mockResolvedValue({ resourceId:'plan-1',effectiveVersion:2,undoOperation:{kind:'remove_candidate'} });
    const adapters=createFoodCapabilityAdapters({recipes:{execute},meal_planning:{execute},groceries:{execute},savings:{execute}});
    const result=await adapters.execute({operationId:'meal_planning.candidate.add',input:{mealPlanId:'plan-1',expectedVersion:1,candidate:{}},confirmed:true,idempotencyKey:'k',origin:{channel:'unified_chat',threadId:'t'}});
    expect(execute).toHaveBeenCalledWith('meal_planning.candidate.add',expect.any(Object),expect.objectContaining({idempotencyKey:'k'}));
    expect(result).toEqual(expect.objectContaining({status:'completed',resourceId:'plan-1',beforeVersion:1,effectiveVersion:2,authority:'reviewed',canUndo:true}));
  });
  it('requires confirmation and turns native handoffs into canonical screen references', async () => {
    const execute=jest.fn();const adapters=createFoodCapabilityAdapters({recipes:{execute},meal_planning:{execute},groceries:{execute},savings:{execute}});
    await expect(adapters.execute({operationId:'food_scenario.accept',input:{scenarioId:'s',expectedVersion:1},confirmed:false,idempotencyKey:'k',origin:{channel:'unified_chat',threadId:'t'}})).rejects.toThrow('food_adapter.confirmation_required');
    expect(await adapters.execute({operationId:'groceries.handoff.open',input:{retailerHandoffId:'h'},confirmed:true,idempotencyKey:'k2',origin:{channel:'unified_chat',threadId:'t'}})).toEqual(expect.objectContaining({status:'pending_client_action',returnTarget:expect.objectContaining({capability:'groceries',screen:'GroceryHandoff'})}));
    expect(await adapters.execute({operationId:'savings.coupon.open',input:{offerId:'o'},confirmed:true,idempotencyKey:'k3',origin:{channel:'unified_chat',threadId:'t'}})).toEqual(expect.objectContaining({status:'pending_client_action',returnTarget:expect.objectContaining({capability:'savings',screen:'GrocerySavings'})}));
    expect(execute).not.toHaveBeenCalled();
  });
  it('never adapts forbidden checkout, payment, rights attestation, or unsupported coupon application', async () => {
    const execute=jest.fn();const adapters=createFoodCapabilityAdapters({recipes:{execute},meal_planning:{execute},groceries:{execute},savings:{execute}});
    await expect(adapters.execute({operationId:'groceries.checkout',input:{},confirmed:true,idempotencyKey:'k',origin:{channel:'unified_chat',threadId:null}})).rejects.toThrow('food_adapter.forbidden');
  });
});
