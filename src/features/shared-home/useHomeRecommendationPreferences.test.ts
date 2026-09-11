import AsyncStorage from "@react-native-async-storage/async-storage";
import { useHomeRecommendationPreferences as store } from "./useHomeRecommendationPreferences";
beforeEach(async () => {
  await AsyncStorage.clear();
  store.setState({ byUserId: {}, hydrated: true });
});
it("keeps account preferences separate and persists hide/later through hydration", async () => {
  store
    .getState()
    .dispatch("alice", { type: "offer", id: "money", status: "later" });
  store.getState().dispatch("alice", { type: "hidden", value: true });
  store
    .getState()
    .dispatch("bob", { type: "offer", id: "meals", status: "declined" });
  await store.persist.rehydrate();
  expect(store.getState().byUserId.alice).toEqual({
    hidden: true,
    offers: { money: "later" },
  });
  expect(store.getState().byUserId.bob).toEqual({
    hidden: false,
    offers: { meals: "declined" },
  });
});
it("does not record anonymous preferences", () => {
  store.getState().dispatch("", { type: "hidden", value: true });
  expect(store.getState().byUserId).toEqual({});
});
