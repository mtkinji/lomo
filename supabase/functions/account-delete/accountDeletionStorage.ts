export type AccountStorageTarget = {
  bucket: string;
  prefix: string;
};

export type AccountStorageDependencies = {
  listPage(target: AccountStorageTarget, offset: number, limit: number): Promise<Array<{
    name: string;
    isFolder: boolean;
  }>>;
  remove(bucket: string, paths: string[]): Promise<void>;
};

const LIST_PAGE_SIZE = 1000;
const REMOVE_BATCH_SIZE = 100;

async function listAllFiles(
  root: AccountStorageTarget,
  dependencies: AccountStorageDependencies,
): Promise<string[]> {
  const files: string[] = [];
  const pending = [root.prefix.replace(/\/$/, '')];
  while (pending.length) {
    const prefix = pending.shift()!;
    for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
      const page = await dependencies.listPage({ ...root, prefix }, offset, LIST_PAGE_SIZE);
      for (const item of page) {
        const path = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.isFolder) pending.push(path);
        else files.push(path);
      }
      if (page.length < LIST_PAGE_SIZE) break;
    }
  }
  return files;
}

export async function removeStorageManifest(
  targets: AccountStorageTarget[],
  dependencies: AccountStorageDependencies,
): Promise<number> {
  let removedCount = 0;
  for (const target of targets) {
    const paths = await listAllFiles(target, dependencies);
    for (let index = 0; index < paths.length; index += REMOVE_BATCH_SIZE) {
      const batch = paths.slice(index, index + REMOVE_BATCH_SIZE);
      await dependencies.remove(target.bucket, batch);
      removedCount += batch.length;
    }
    if ((await listAllFiles(target, dependencies)).length > 0) {
      throw new Error('storage_cleanup_incomplete');
    }
  }
  return removedCount;
}
