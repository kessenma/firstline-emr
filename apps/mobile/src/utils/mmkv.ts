import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV();

export const storageHelpers = {
  getString: (key: string) => storage.getString(key),
  set: (key: string, value: string | number | boolean) => storage.set(key, value),
  delete: (key: string) => storage.remove(key),
  clearAll: () => storage.clearAll(),
  contains: (key: string) => storage.contains(key),
  getAllKeys: () => storage.getAllKeys(),
};
