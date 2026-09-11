import { useState } from "react";
import { Alert, Image } from "react-native";
import { SharedLifeFeed } from "../shared-home/SharedLifeFeed";
import { SharedLifePage } from "../shared-home/SharedLifePage";
import { HomeMediaSourceContext } from "../shared-home/SharedLifeMediaGallery";
import type { SharedLifeRepository } from "../shared-home/sharedLifeRepository";
import type { HomePost, HomeReply } from "../shared-home/sharedLifeTypes";
import { Button, HStack } from '../../ui/primitives';
import { buildHomeRecommendations, normalizeHomeRecommendationPreferences, selectHomeRecommendations, updateHomeRecommendationPreferences, type HomeRecommendationPreferenceAction } from '../shared-home/homeRecommendations';
const viewer = "00000000-0000-4000-8000-000000009001";
const household = "00000000-0000-4000-8000-000000009002";
const author = "00000000-0000-4000-8000-000000009003";
const source = async () =>
  Image.resolveAssetSource(
    require("../../../assets/images/focus/canyon-spring-poster.jpg"),
  );
/** Local fictional fixtures only. No backend calls and no real household publication. */
export function HomeConnectedPreview({ onClose }: { onClose: () => void }) {
  const [recommendationScenario, setRecommendationScenario] = useState<'off' | 'new' | 'meals'>('off');
  const [recommendationPreferences, setRecommendationPreferences] = useState(() => normalizeHomeRecommendationPreferences(undefined));
  const offers = buildHomeRecommendations({ access: 'adult', household: recommendationScenario === 'new' ? 'solo' : 'together', money: 'unused', meals: recommendationScenario === 'meals' ? 'active' : 'unused' }, recommendationPreferences);
  const dispatchRecommendation = (action: HomeRecommendationPreferenceAction) => setRecommendationPreferences(p => updateHomeRecommendationPreferences(p, action));
  const recommendationPreview = recommendationScenario === 'off' ? undefined : {
    model: { offers, ...selectHomeRecommendations(offers, recommendationPreferences), preferences: recommendationPreferences, dispatch: dispatchRecommendation, eligible: true, loading: false, partialError: false, retry: () => undefined },
    onOpen: (offer: (typeof offers)[number]) => {
      dispatchRecommendation({ type: 'offer', id: offer.id, status: 'accepted' });
      Alert.alert('Fictional recommendation', `The live action opens ${offer.destination}. No setup or sharing is performed in this preview.`);
    },
  };
  const [repository] = useState(() => {
    const posts: HomePost[] = Array.from({ length: 100 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(9100 + i).padStart(12, "0")}`,
      kind: i % 4 === 1 ? "chore_update" : "moment",
      authorId: i % 4 === 1 ? null : author,
      authorName: i % 4 === 1 ? "Sam" : i % 4 === 2 ? "Maya" : "Alex",
      audience: "household",
      householdId: household,
      householdName: "Our household",
      text:
        i % 4 === 0
          ? "We took the long way home. I’m glad we did."
          : i % 4 === 2
            ? "Finished the garden beds today. Small steps really do add up."
            : i % 4 === 3
              ? "The kids made up a new dinner tradition: everyone gets to tell one tiny good thing from their day. Tonight’s winner was finding a ladybug."
              : "",
      media:
        i % 4 === 0
          ? Array.from({ length: 4 }, (_, j) => ({
              path: `preview-${i}-${j}`,
              alt: "Sunlight on a canyon stream",
            }))
          : [],
      attachment:
        i % 4 === 0
          ? {
              kind: "place",
              name: "A little canyon trail",
              latitude: 40,
              longitude: -111,
            }
          : i % 4 === 2
            ? { kind: "goal_completed", title: "Make a place to grow" }
            : null,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
      reactionCount: 2,
      replyCount: i % 4 === 0 ? 1 : 0,
      myReaction: null,
      reactors: [
        { id: viewer, name: "Maya" },
        { id: "ben", name: "Ben" },
      ],
      replyPreview:
        i % 4 === 0
          ? {
              id: `reply-${i}`,
              authorId: viewer,
              authorName: "Maya",
              text: "Let’s go together next time.",
              createdAt: new Date().toISOString(),
            }
          : null,
      choreUpdate:
        i % 4 === 1
          ? {
              items: [
                {
                  occurrenceId: `c${i}`,
                  title: "Take out the recycling",
                  state: "completed",
                  scheduledDate: null,
                  reportedEarlier: false,
                },
                {
                  occurrenceId: `d${i}`,
                  title: "Clear the table",
                  state: "waiting_approval",
                  scheduledDate: null,
                  reportedEarlier: false,
                },
              ],
            }
          : null,
    }));
    const saved = new Set<string>();
    const seen = new Set<string>();
    const collections: { id: string; name: string; included?: boolean }[] = [];
    const replies = new Map<string, HomeReply[]>();
    const bootstrap = async () => ({
      households: [{ id: household, name: "Our household" }],
      people: [{ id: author, name: "Alex" }],
      householdChoices: [],
    });
    const getPosts = (args: any, library = false) => ({
      posts: posts
        .filter(
          (p) =>
            (!library || saved.has(p.id)) &&
            (!args.authorId || p.authorId === args.authorId) &&
            (!args.before || p.createdAt < args.before) &&
            (!args.query ||
              p.text.toLowerCase().includes(args.query.toLowerCase())),
        )
        .slice(0, 30)
        .map((p) => ({ ...p, saved: saved.has(p.id) })),
    });
    const conversation = async (id: string) => {
      const post = posts.find((p) => p.id === id);
      if (!post) throw new Error("No preview post");
      return {
        post,
        replies:
          replies.get(id) ?? (post.replyPreview ? [post.replyPreview] : []),
      };
    };
    const command = async (op: string, args: any = {}) => {
      if (op === "feed" || op === "library")
        return getPosts(args, op === "library");
      if (op === "refresh_posts")
        return {
          posts: posts
            .filter((p) => args.ids.includes(p.id))
            .map((p) => ({ ...p, saved: saved.has(p.id) })),
        };
      if (op === "catchup")
        return [
          {
            id: author,
            name: "Alex",
            kind: "person",
            count: posts.filter((p) => p.authorId === author && !seen.has(p.id))
              .length,
          },
        ];
      if (op === "catchup_posts")
        return {
          posts: posts
            .filter((p) => p.authorId === author && !seen.has(p.id))
            .slice()
            .reverse(),
        };
      if (op === "seen") {
        args.ids.forEach((id: string) => seen.add(id));
        return {};
      }
      if (op === "reactors")
        return posts.find((p) => p.id === args.id)?.reactors ?? [];
      if (op === "bookmark") {
        args.saved ? saved.add(args.id) : saved.delete(args.id);
        return {};
      }
      if (op === "collections") return collections;
      if (op === "collection_put") {
        collections.push({ id: args.id, name: args.name });
        return {};
      }
      if (op === "collect") {
        const c = collections.find((c) => c.id === args.collectionId);
        if (c) c.included = args.included;
        return {};
      }
      if (op === "collection_delete") {
        const i = collections.findIndex((c) => c.id === args.id);
        if (i >= 0) collections.splice(i, 1);
        return {};
      }
      if (op === "conversation") return conversation(args.id);
      if (op === "react") {
        const p = posts.find((p) => p.id === args.id);
        if (p) {
          p.myReaction = args.reaction;
          p.reactionCount = args.reaction ? 3 : 2;
        }
        return {};
      }
      if (op === "reply") {
        const old = await conversation(args.postId);
        replies.set(args.postId, [
          ...old.replies,
          {
            id: args.id,
            authorId: viewer,
            authorName: "You",
            text: args.text,
            createdAt: new Date().toISOString(),
          },
        ]);
        return {};
      }
      if (op === "notes") return [];
      return {};
    };
    return {
      command,
      bootstrap,
      list: (args = {}) => Promise.resolve(getPosts(args)),
      conversation,
      connections: async () => [],
      cleanupMedia: async () => undefined,
    } as SharedLifeRepository;
  });
  if (!__DEV__) return null;
  return (
    <HomeMediaSourceContext.Provider value={source}>
      <SharedLifeFeed userId={viewer} previewRepository={repository} recommendationPreview={recommendationPreview}
        renderFrame={(content, shareAction, moreMenu) => <SharedLifePage title="Home · Preview" onClose={onClose} rightElement={shareAction} moreMenu={moreMenu}>
          <HStack><Button variant="ghost" onPress={() => {
            setRecommendationScenario(s => s === 'off' ? 'meals' : s === 'meals' ? 'new' : 'off');
            setRecommendationPreferences(normalizeHomeRecommendationPreferences(undefined));
          }}>{`Recommendations: ${recommendationScenario}`}</Button></HStack>
          {content}
        </SharedLifePage>}/>

    </HomeMediaSourceContext.Provider>
  );
}
