import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { syncPlaidConnectionBatch } from "../plaidSyncBatch.ts";

Deno.test("bank sync overlaps independent connections with at most two in flight and preserves order", async () => {
  let active = 0, max = 0;
  const started: string[] = [];
  const release: Record<string, () => void> = {};
  const done = syncPlaidConnectionBatch(["a", "b", "c"], async (id) => {
    active++;
    max = Math.max(max, active);
    started.push(id);
    await new Promise<void>((resolve) => {
      release[id] = resolve;
    });
    active--;
    return id;
  });
  await Promise.resolve();
  assertEquals(started, ["a", "b"]);
  release.b();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assertEquals(started, ["a", "b", "c"]);
  release.c();
  release.a();
  assertEquals(await done, ["a", "b", "c"]);
  assertEquals(max, 2);
});

Deno.test("one failed bank does not abandon or skip the others before reporting failure", async () => {
  const attempted: string[] = [];
  await assertRejects(
    () =>
      syncPlaidConnectionBatch(["a", "b", "c"], async (id) => {
        attempted.push(id);
        if (id === "a") throw new Error("bank unavailable");
        return id;
      }),
    Error,
    "bank unavailable",
  );
  assertEquals(attempted.sort(), ["a", "b", "c"]);
});

Deno.test("an empty bank batch is empty", async () => {
  assertEquals(await syncPlaidConnectionBatch([], async (id) => id), []);
});

Deno.test("shared foundation writes remain serial even when banks overlap, and recover after failure", async () => {
  const { createSerialTaskRunner } = await import("../plaidSyncBatch.ts");
  const run = createSerialTaskRunner();
  let active = 0, max = 0;
  const calls = [0, 1, 2].map((i) =>
    run(async () => {
      active++;
      max = Math.max(max, active);
      await new Promise((r) => setTimeout(r, 0));
      active--;
      if (i === 0) throw new Error("first fails");
      return i;
    })
  );
  const results = await Promise.allSettled(calls);
  assertEquals(max, 1);
  assertEquals(results.map((r) => r.status), [
    "rejected",
    "fulfilled",
    "fulfilled",
  ]);
});
