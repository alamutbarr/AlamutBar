import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const memory = new Map<string, string>();

type WebStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function webStorage(): WebStorage | null {
  const host = globalThis as { localStorage?: WebStorage };
  return host.localStorage ?? null;
}

export async function readKey(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return webStorage()?.getItem(key) ?? memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function writeKey(key: string, value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      const store = webStorage();
      if (!store) throw new Error('no storage');
      if (value == null) store.removeItem(key);
      else store.setItem(key, value);
      return;
    } catch {
      if (value == null) memory.delete(key);
      else memory.set(key, value);
      return;
    }
  }
  if (value == null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}
