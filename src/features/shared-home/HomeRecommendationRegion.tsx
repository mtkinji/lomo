import { ScrollView, StyleSheet, View } from "react-native";
import { Button, HStack, Text, VStack } from "../../ui/primitives";
import { Icon } from "../../ui/Icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/DropdownMenu";
import { colors, spacing, typography } from "../../theme";
import { SharedLifePage } from "./SharedLifePage";
import type {
  HomeRecommendation,
  HomeRecommendationPreferenceAction,
} from "./homeRecommendations";
import type { useHomeRecommendations } from "./useHomeRecommendations";
type Model = ReturnType<typeof useHomeRecommendations>;
type Actions = {
  onOpen: (offer: HomeRecommendation) => void;
  dispatch: (action: HomeRecommendationPreferenceAction) => void;
};
export function HomeRecommendations({
  featured,
  complementary,
  onOpen,
  dispatch,
  onOverview,
}: Pick<Model, "featured" | "complementary"> &
  Actions & { onOverview: () => void }) {
  if (!featured) return null;
  return (
    <VStack space="xs" style={styles.guide}>
      <HStack alignItems="center" justifyContent="space-between">
        <Text style={[typography.titleSm, styles.title]} accessibilityRole="header">
          {featured.title}
        </Text>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              iconButtonSize={44}
              accessibilityLabel="Recommendation options"
            >
              <Icon name="more" size={20} color={colors.textPrimary} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              label="Save for later"
              onPress={() =>
                dispatch({ type: "offer", id: featured.id, status: "later" })
              }
            />
            <DropdownMenuItem
              label="Not for me"
              onPress={() =>
                dispatch({ type: "offer", id: featured.id, status: "declined" })
              }
            />
            <DropdownMenuItem label="Your next steps" onPress={onOverview} />
            <DropdownMenuItem
              label="Hide recommendations"
              onPress={() => dispatch({ type: "hidden", value: true })}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </HStack>
      <Text tone="secondary" style={typography.bodySm}>{featured.body}</Text>
      <View style={styles.actions}>
        <Button variant="link" accessibilityLabel={featured.action} onPress={() => onOpen(featured)}>
          {featured.kind === "continue" ? "Continue →" : "Get started →"}
        </Button>
        {complementary ? (
          <Button variant="link" accessibilityLabel={complementary.action} onPress={() => onOpen(complementary)}>
            <Text tone="secondary" style={typography.bodySm}>
              {complementary.kind === "discover" ? "Try" : "Continue"} {complementary.id === "money" ? "Money" : complementary.id === "meals" ? "Meals" : "Household"} →
            </Text>
          </Button>
        ) : null}
      </View>
    </VStack>
  );
}
export function HomeNextStepsPage({
  model,
  onOpen,
  onClose,
}: {
  model: Model;
  onOpen: Actions["onOpen"];
  onClose: () => void;
}) {
  const groups = [
    {
      title: "In progress",
      match: (o: HomeRecommendation) =>
        o.kind === "continue" &&
        !["later", "declined"].includes(model.preferences.offers[o.id] ?? ""),
    },
    {
      title: "Try something new",
      match: (o: HomeRecommendation) =>
        o.kind === "discover" &&
        !["later", "declined"].includes(model.preferences.offers[o.id] ?? ""),
    },
    {
      title: "Saved for later",
      match: (o: HomeRecommendation) =>
        model.preferences.offers[o.id] === "later",
    },
    {
      title: "Not for you",
      match: (o: HomeRecommendation) =>
        model.preferences.offers[o.id] === "declined",
    },
  ];
  return (
    <SharedLifePage title="Your next steps" onClose={onClose}>
      <ScrollView contentContainerStyle={styles.overview}>
        <Text tone="secondary">
          Choose what would help you. These suggestions are private, and you
          don’t need to set up everything.
        </Text>
        {model.loading ? (
          <Text tone="secondary">Checking your next steps…</Text>
        ) : null}
        {model.partialError ? (
          <VStack space="sm">
            <Text>Some next steps couldn’t be checked.</Text>
            <Button variant="outline" onPress={model.retry}>
              Check again
            </Button>
          </VStack>
        ) : null}
        {model.preferences.hidden ? (
          <Button
            variant="outline"
            onPress={() => model.dispatch({ type: "hidden", value: false })}
          >
            Show recommendations on Home
          </Button>
        ) : null}
        {!model.loading && !model.partialError && !model.offers.length ? (
          <Text>
            You have no suggested setup steps right now. Your capabilities are
            always available from the menu.
          </Text>
        ) : null}
        {groups.map((group) => {
          const offers = model.offers.filter(group.match);
          if (!offers.length) return null;
          return (
            <VStack key={group.title} space="lg">
              <Text accessibilityRole="header" style={typography.titleSm}>
                {group.title}
              </Text>
              {offers.map((offer) => {
                const status = model.preferences.offers[offer.id];
                const parked = status === "later" || status === "declined";
                return (
                  <VStack key={offer.id} space="sm" style={styles.detailRow}>
                    <Text style={typography.titleSm}>{offer.title}</Text>
                    <Text tone="secondary">{offer.body}</Text>
                    <Button variant="outline" onPress={() => onOpen(offer)}>
                      {offer.action}
                    </Button>
                    {parked ? (
                      <Button
                        variant="ghost"
                        onPress={() => {
                          model.dispatch({
                            type: "offer",
                            id: offer.id,
                            status: null,
                          });
                          model.dispatch({ type: "hidden", value: false });
                        }}
                      >
                        Show this on Home
                      </Button>
                    ) : (
                      <HStack>
                        <Button
                          variant="ghost"
                          onPress={() =>
                            model.dispatch({
                              type: "offer",
                              id: offer.id,
                              status: "later",
                            })
                          }
                        >
                          Later
                        </Button>
                        <Button
                          variant="ghost"
                          onPress={() =>
                            model.dispatch({
                              type: "offer",
                              id: offer.id,
                              status: "declined",
                            })
                          }
                        >
                          Not for me
                        </Button>
                      </HStack>
                    )}
                  </VStack>
                );
              })}
            </VStack>
          );
        })}
      </ScrollView>
    </SharedLifePage>
  );
}
const styles = StyleSheet.create({
  guide: { paddingTop: spacing.sm, paddingBottom: spacing["2xl"] },
  title: { flex: 1 },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.lg, marginLeft: -spacing.sm },
  overview: {
    padding: spacing.lg,
    paddingBottom: spacing["3xl"],
    gap: spacing.xl,
  },
  detailRow: {
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
