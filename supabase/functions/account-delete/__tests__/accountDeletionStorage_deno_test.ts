import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import {
  removeStorageManifest,
  type AccountStorageDependencies,
  type AccountStorageTarget,
} from '../accountDeletionStorage.ts';

function dependencies(files: string[]) {
  const removed: string[][] = [];
  const remaining = new Set(files);
  const deps: AccountStorageDependencies = {
    listPage: async (target, offset, limit) => {
      const prefix = `${target.prefix}/`;
      const immediate = new Map<string, { name: string; isFolder: boolean }>();
      for (const path of remaining) {
        if (!path.startsWith(prefix)) continue;
        const rest = path.slice(prefix.length);
        const [name, ...tail] = rest.split('/');
        immediate.set(name, { name, isFolder: tail.length > 0 });
      }
      return [...immediate.values()].slice(offset, offset + limit);
    },
    remove: async (_bucket, paths) => {
      removed.push(paths);
      paths.forEach((path) => remaining.delete(path));
    },
  };
  return { deps, removed };
}

const target: AccountStorageTarget = { bucket: 'hero_images', prefix: 'user-1' };

Deno.test('storage cleanup paginates listings and removes batches of one hundred', async () => {
  const files = Array.from({ length: 1205 }, (_, index) => `user-1/nested/${index}.jpg`);
  const { deps, removed } = dependencies(files);
  const count = await removeStorageManifest([target], deps);
  assertEquals(count, 1205);
  assertEquals(removed.length, 13);
  assertEquals(Math.max(...removed.map((batch) => batch.length)), 100);
});

Deno.test('storage cleanup verifies the manifest is empty after removal', async () => {
  const { deps } = dependencies(['user-1/a.jpg']);
  deps.remove = async () => undefined;
  await assertRejects(() => removeStorageManifest([target], deps), Error, 'storage_cleanup_incomplete');
});

Deno.test('storage listing failure stops deletion', async () => {
  const { deps, removed } = dependencies([]);
  deps.listPage = async () => { throw new Error('list failed'); };
  await assertRejects(() => removeStorageManifest([target], deps), Error, 'list failed');
  assertEquals(removed, []);
});

Deno.test('storage removal failure propagates instead of reporting success', async () => {
  const { deps } = dependencies(['user-1/a.jpg']);
  deps.remove = async () => { throw new Error('remove failed'); };
  await assertRejects(() => removeStorageManifest([target], deps), Error, 'remove failed');
});
