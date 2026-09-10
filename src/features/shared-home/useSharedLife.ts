import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  getSharedLifeRepository,
  type SharedLifeRepository,
} from "./sharedLifeRepository";
import { reconcileHomePosts } from "./sharedLifePresentation";
import { mergeHomePage } from "./sharedLifeDomain";
import type {
  HomeBootstrap,
  HomeFeedFilter,
  HomePost,
} from "./sharedLifeTypes";
const empty: HomeBootstrap = {
  households: [],
  people: [],
  householdChoices: [],
};
export function useSharedLife(
  userId: string | null,
  provided?: SharedLifeRepository,
) {
  const repositoryRef = useRef<SharedLifeRepository | null>(null);
  if (!repositoryRef.current)
    repositoryRef.current = provided ?? getSharedLifeRepository();
  const repository = repositoryRef.current;
  const account = useRef(userId);
  account.current = userId;
  const generation = useRef(0);
  const inFlight = useRef<number | null>(null);
  const [state, setState] = useState<{
    owner: string | null;
    posts: HomePost[];
    bootstrap: HomeBootstrap;
    loading: boolean;
    error: string | null;
    more: boolean;
  }>({
    owner: userId,
    posts: [],
    bootstrap: empty,
    loading: Boolean(userId),
    error: null,
    more: false,
  });
  const [incoming, setIncoming] = useState<HomePost[]>([]);
  const [filter, setFilter] = useState<HomeFeedFilter>({});
  const filterKey = JSON.stringify(filter);
  const suspended = useRef<HomePost[] | null>(null);
  const postsRef = useRef(state.posts);
  postsRef.current = state.posts;
  const refresh = useCallback(
    async (append = false) => {
      if (!userId || AppState.currentState === "background" || AppState.currentState === "inactive" || (append && inFlight.current !== null)) return;
      if (!append) setIncoming([]);
      const request = ++generation.current;
      inFlight.current = request;
      setState((old) => ({ ...old, loading: true, error: null }));
      const last = append ? postsRef.current.at(-1) : undefined;
      try {
        const [page, bootstrap] = await Promise.all([
          repository.list({
            ...JSON.parse(filterKey),
            ...(last ? { before: last.createdAt, beforeId: last.id } : {}),
          }),
          repository.bootstrap(),
        ]);
        if (account.current !== userId || generation.current !== request)
          return;
        setState((old) => ({
          owner: userId,
          posts: append ? mergeHomePage(old.posts, page.posts) : page.posts,
          bootstrap,
          loading: false,
          error: null,
          more: page.posts.length === 30,
        }));
      } catch (error) {
        if (account.current !== userId || generation.current !== request)
          return;
        setState({
          owner: userId,
          posts: [],
          bootstrap: empty,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Home could not be loaded.",
          more: false,
        });
      } finally {
        if (inFlight.current === request) inFlight.current = null;
      }
    },
    [repository, userId, filterKey],
  );
  const revalidate = useCallback(async () => {
    if (AppState.currentState !== "active" || inFlight.current !== null) return;
    if (!postsRef.current.length) {
      await refresh();
      return;
    }

    const request = ++generation.current;
    inFlight.current = request;
    return Promise.all([
      repository.command<{ posts: HomePost[] }>("refresh_posts", {
        ids: postsRef.current.map((p) => p.id),
      }),
      repository.list(JSON.parse(filterKey)),
    ])
      .then(([authorized, head]) => {
        if (account.current !== userId || generation.current !== request)
          return;
        const next = reconcileHomePosts(
          postsRef.current,
          authorized.posts,
          head.posts,
        );
        setIncoming(next.incoming);
        setState((old) => ({ ...old, posts: next.posts, error: null }));
      })
      .catch(() => {
        if (account.current === userId && generation.current === request)
          setState((old) => ({
            ...old,
            posts: [],
            error: "Reconnect to refresh these moments.",
          }));
      })
      .finally(() => {
        if (inFlight.current === request) inFlight.current = null;
      });
  }, [repository, userId, filterKey, refresh]);
  useEffect(() => {
    suspended.current = null;
    setIncoming([]);
    setState({
      owner: userId,
      posts: [],
      bootstrap: empty,
      loading: Boolean(userId),
      error: null,
      more: false,
    });
    void refresh();
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        const remembered = suspended.current;
        if (!remembered?.length) {
          void refresh();
          return;
        }
        const request = ++generation.current;
        inFlight.current = request;
        setState((old) => ({ ...old, loading: true }));
        void Promise.all([
          repository.command<{ posts: HomePost[] }>("refresh_posts", {
            ids: remembered.map((p) => p.id),
          }),
          repository.bootstrap(),
        ])
          .then(([authorized, bootstrap]) => {
            if (account.current !== userId || generation.current !== request)
              return;
            suspended.current = null;
            setState((old) => ({
              ...old,
              posts: reconcileHomePosts(remembered, authorized.posts, []).posts,
              bootstrap,
              loading: false,
              error: null,
            }));
          })
          .catch(() => {
            if (account.current === userId && generation.current === request)
              setState((old) => ({
                ...old,
                posts: [],
                bootstrap: empty,
                loading: false,
                error: "Reconnect to refresh these moments.",
              }));
          })
          .finally(() => {
            if (inFlight.current === request) inFlight.current = null;
          });
      } else {
        generation.current++;
        inFlight.current = null;
        if (postsRef.current.length) suspended.current = postsRef.current;
        setIncoming([]);
        setState((old) => ({ ...old, posts: [], bootstrap: empty }));
      }
    });
    const timer = setInterval(() => void revalidate(), 30_000);
    return () => {
      generation.current++;
      inFlight.current = null;
      subscription.remove();
      clearInterval(timer);
    };
  }, [refresh, userId]);
  return {
    ...state,
    posts: state.owner === userId ? state.posts : [],
    bootstrap: state.owner === userId ? state.bootstrap : empty,
    repository,
    incoming,
    refresh,
    revalidate,
    setFilter,
    filter,
  };
}
