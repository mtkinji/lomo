import {
  loadHomeRecommendationEvidence,
  type HomeRecommendationSources,
} from "./homeRecommendationEvidence";
function sources(): HomeRecommendationSources {
  return {
    household: jest
      .fn()
      .mockResolvedValue({
        household: null,
        currentMembershipId: null,
        members: [],
        activations: [],
        grants: [],
      }),
    money: jest
      .fn()
      .mockResolvedValue({
        completedAt: null,
        checkpoint: null,
        introductionSeenAt: null,
      }),
    meals: jest.fn().mockResolvedValue([]),
  };
}
it("verifies access before reading private owner evidence", async () => {
  const s = sources();
  (s.household as jest.Mock).mockResolvedValue({
    household: { id: "h" },
    currentMembershipId: "c",
    members: [{ id: "c", role: "child" }],
  });
  const result = await loadHomeRecommendationEvidence(s, () => true);
  expect(result.evidence.access).toBe("child");
  expect(s.money).not.toHaveBeenCalled();
  expect(s.meals).not.toHaveBeenCalled();
});
it("fails closed on household errors or missing current membership", async () => {
  const s = sources();
  (s.household as jest.Mock).mockRejectedValue(new Error("offline"));
  expect(
    (await loadHomeRecommendationEvidence(s, () => true)).evidence.access,
  ).toBe("unknown");
  expect(s.money).not.toHaveBeenCalled();
  (s.household as jest.Mock).mockResolvedValue({
    household: { id: "h" },
    currentMembershipId: "missing",
    members: [],
  });
  expect(
    (await loadHomeRecommendationEvidence(s, () => true)).evidence.access,
  ).toBe("unknown");
});
it("isolates source errors and projects real setup evidence", async () => {
  const s = sources();
  (s.money as jest.Mock).mockRejectedValue(new Error("storage"));
  (s.meals as jest.Mock).mockResolvedValue([
    { state: "draft", candidates: [{ lifecycle: "idea" }] },
  ]);
  const result = await loadHomeRecommendationEvidence(s, () => true);
  expect(result.evidence).toMatchObject({
    access: "adult",
    money: "unknown",
    meals: "active",
  });
  expect(result.partialError).toBe(true);
});
it("does not call archived plans unfinished work or a checkpoint completed", async () => {
  const s = sources();
  (s.money as jest.Mock).mockResolvedValue({
    completedAt: null,
    checkpoint: "account",
  });
  (s.meals as jest.Mock).mockResolvedValue([
    { state: "archived", candidates: [{ lifecycle: "idea" }] },
  ]);
  expect(
    (await loadHomeRecommendationEvidence(s, () => true)).evidence,
  ).toMatchObject({ money: "started", meals: "settled" });
});
it("does not start downstream reads after account cancellation", async () => {
  const s = sources();
  await loadHomeRecommendationEvidence(s, () => false);
  expect(s.money).not.toHaveBeenCalled();
  expect(s.meals).not.toHaveBeenCalled();
});
it("does not keep offering setup after an introduction or an existing owner plan", async () => {
  const s = sources();
  (s.money as jest.Mock).mockResolvedValue({
    introductionSeenAt: "today",
    checkpoint: null,
    completedAt: null,
  });
  expect(
    (await loadHomeRecommendationEvidence(s, () => true)).evidence.money,
  ).toBe("settled");
  (s.money as jest.Mock).mockResolvedValue({
    introductionSeenAt: null,
    checkpoint: "account",
    completedAt: null,
    hasActivePlan: true,
  });
  expect(
    (await loadHomeRecommendationEvidence(s, () => true)).evidence.money,
  ).toBe("complete");
});
