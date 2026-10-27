/**
 * External OAuth tokens are opaque Kwilt tokens, not Supabase session JWTs.
 * These narrow, service-only RPCs establish the already-verified actor inside
 * one database transaction before calling the existing food authority.
 * Never manufacture a user JWT or broaden a canonical reader's grants.
 */
const ACTOR_READ_RPCS: Record<string, string> = {
  get_kwilt_agent_food_control_snapshot: 'get_kwilt_external_food_control_snapshot',
  list_kwilt_recipe_catalog_v2: 'list_kwilt_external_recipe_catalog_v2',
  get_kwilt_meal_cart_history: 'get_kwilt_external_meal_cart_history',
};

type RpcClient = { rpc(name: string, args: Record<string, unknown>): PromiseLike<unknown> };

export function createExternalFoodActorClient<T extends RpcClient>(client: T, userId: string): T {
  return new Proxy(client, {
    get(target, property) {
      if (property === 'rpc') return (name: string, args: Record<string, unknown>) => {
        const wrapper = ACTOR_READ_RPCS[name];
        return wrapper
          ? target.rpc(wrapper, { ...args, p_user_id: userId })
          : target.rpc(name, args);
      };
      const value = Reflect.get(target, property);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
