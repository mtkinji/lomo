import { createExternalFoodActorClient } from '../externalFoodActor';

test.each([
  ['get_kwilt_agent_food_control_snapshot', 'get_kwilt_external_food_control_snapshot', {}],
  ['list_kwilt_recipe_catalog_v2', 'list_kwilt_external_recipe_catalog_v2', { p_after_roster_id: 'DI050', p_limit: 50 }],
  ['get_kwilt_meal_cart_history', 'get_kwilt_external_meal_cart_history', { p_plan_id: 'plan-1' }],
])('binds %s to the verified OAuth actor, never argument-supplied identity', async (source, wrapper, args) => {
  const rpc = jest.fn(async () => ({ data: [], error: null }));
  const client = createExternalFoodActorClient({ rpc }, 'actor-1');
  await client.rpc(source as string, { ...args as object, p_user_id: 'attacker' });
  expect(rpc).toHaveBeenCalledWith(wrapper, { ...args as object, p_user_id: 'actor-1' });
});

test('does not mutate the service client or rebind unrelated RPCs', async () => {
  const rpc = jest.fn(async () => ({ data: null, error: null }));
  const from = jest.fn(function (this: unknown) { return this; });
  const service = { rpc, from };
  const actor = createExternalFoodActorClient(service, 'actor-1');
  await actor.rpc('some_other_rpc', { p_user_id: 'explicit' });
  expect(rpc).toHaveBeenCalledWith('some_other_rpc', { p_user_id: 'explicit' });
  expect(actor.from()).toBe(service);
  expect(service.rpc).toBe(rpc);
});
