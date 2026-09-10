import { useEffect, useRef, useState } from "react";
type Value = {
  reaction: string | null;
  count: number;
  pending: boolean;
  error?: string;
};
type Entry = {
  confirmed: string | null;
  desired: string | null;
  baseCount: number;
  original: string | null;
  running: boolean;
};
export function useHomeReaction(
  command: (op: string, args: object) => Promise<unknown>,
  posts?: { id: string; myReaction: string | null; reactionCount: number }[],
) {
  const entries = useRef(new Map<string, Entry>());
  const active = useRef(true);
  const [values, setValues] = useState<Record<string, Value>>({});
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    if (!posts) return;
    const settled = posts
      .filter((p) => {
        const e = entries.current.get(p.id);
        return e && !e.running && e.confirmed === p.myReaction;
      })
      .map((p) => p.id);
    if (settled.length) {
      settled.forEach((id) => entries.current.delete(id));
      setValues((old) => {
        const next = { ...old };
        settled.forEach((id) => delete next[id]);
        return next;
      });
    }
  }, [posts]);
  const show = (id: string, e: Entry, error?: string) => {
    if (active.current)
      setValues((v) => ({
        ...v,
        [id]: {
          reaction: e.desired,
          count: Math.max(
            0,
            e.baseCount +
              Number(Boolean(e.desired)) -
              Number(Boolean(e.original)),
          ),
          pending: e.running,
          error,
        },
      }));
  };
  const flush = async (id: string, e: Entry) => {
    if (e.running) return;
    e.running = true;
    show(id, e);
    while (active.current && e.confirmed !== e.desired) {
      const target = e.desired;
      try {
        await command("react", { id, reaction: target });
        e.confirmed = target;
      } catch {
        e.desired = e.confirmed;
        e.running = false;
        show(id, e, "Your reaction could not be saved. Tap to try again.");
        return;
      }
    }
    e.running = false;
    show(id, e);
  };
  return {
    values,
    toggle: (id: string, reaction: string | null, count: number) => {
      let e = entries.current.get(id);
      if (!e) {
        e = {
          confirmed: reaction,
          desired: reaction,
          baseCount: count,
          original: reaction,
          running: false,
        };
        entries.current.set(id, e);
      }
      e.desired = e.desired ? null : "heart";
      show(id, e);
      void flush(id, e);
    },
  };
}
