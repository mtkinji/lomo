import AsyncStorage from '@react-native-async-storage/async-storage';

const ALREADY_HAVE_COACHMARK_KEY = 'kwilt-groceries-already-have-coachmark-v2';
const CART_FLOW_STARTED_KEY = 'kwilt-groceries-cart-flow-started-v1';
const SENT_RECIPE_REMOVAL_KEY = 'kwilt-plan-sent-recipe-removal-v1';
const READY_PLAN_COACHMARK_KEY = 'kwilt-plan-ready-coachmark-v1';

function keyFor(prefix: string, userId: string | null): string {
  return `${prefix}:${userId ?? 'device'}`;
}

export const groceryEducation = {
  async hasSeenAlreadyHave(userId: string | null): Promise<boolean> {
    return (await AsyncStorage.getItem(keyFor(ALREADY_HAVE_COACHMARK_KEY, userId))) === 'seen';
  },

  async markAlreadyHaveSeen(userId: string | null): Promise<void> {
    await AsyncStorage.setItem(keyFor(ALREADY_HAVE_COACHMARK_KEY, userId), 'seen');
  },

  async hasStartedCartFlow(userId: string | null): Promise<boolean> {
    return (await AsyncStorage.getItem(keyFor(CART_FLOW_STARTED_KEY, userId))) === 'started';
  },

  async markCartFlowStarted(userId: string | null): Promise<void> {
    await AsyncStorage.setItem(keyFor(CART_FLOW_STARTED_KEY, userId), 'started');
  },

  async hasSeenSentRecipeRemoval(personId: string | null): Promise<boolean> {
    return (await AsyncStorage.getItem(keyFor(SENT_RECIPE_REMOVAL_KEY, personId))) === 'seen';
  },

  async markSentRecipeRemovalSeen(personId: string | null): Promise<void> {
    await AsyncStorage.setItem(keyFor(SENT_RECIPE_REMOVAL_KEY, personId), 'seen');
  },

  async hasSeenReadyPlan(personId: string | null): Promise<boolean> {
    return (await AsyncStorage.getItem(keyFor(READY_PLAN_COACHMARK_KEY, personId))) === 'seen';
  },

  async markReadyPlanSeen(personId: string | null): Promise<void> {
    await AsyncStorage.setItem(keyFor(READY_PLAN_COACHMARK_KEY, personId), 'seen');
  },
};
