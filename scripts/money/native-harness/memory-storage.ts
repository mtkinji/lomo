// Do not read or change the development host's saved account/store data.
const data = new Map<string, string>();
const storage = {
  getItem: async (key: string) => data.get(key) ?? null,
  setItem: async (key: string, value: string) => { data.set(key, value); },
  removeItem: async (key: string) => { data.delete(key); },
  getAllKeys: async () => [...data.keys()],
  clear: async () => { data.clear(); },
  multiGet: async (keys: string[]) => keys.map((key) => [key, data.get(key) ?? null]),
  multiSet: async (pairs: [string, string][]) => { pairs.forEach(([key, value]) => data.set(key, value)); },
  multiRemove: async (keys: string[]) => { keys.forEach((key) => data.delete(key)); },
};
export default storage;
