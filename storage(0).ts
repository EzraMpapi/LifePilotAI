import AsyncStorage from "@react-native-async-storage/async-storage";

// Defensive wrapper around AsyncStorage. If the native module is unavailable
// (e.g. a dev-client / Expo Go version mismatch), fall back to an in-memory
// store so the whole app never crashes on a storage read/write.
const mem = new Map<string, string>();

function available(): boolean {
  try {
    return !!AsyncStorage && typeof AsyncStorage.getItem === "function";
  } catch {
    return false;
  }
}

export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (!available()) return mem.has(key) ? mem.get(key)! : null;
      return await AsyncStorage.getItem(key);
    } catch {
      return mem.has(key) ? mem.get(key)! : null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      mem.set(key, value);
      if (available()) await AsyncStorage.setItem(key, value);
    } catch {
      // keep in-memory copy only
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      mem.delete(key);
      if (available()) await AsyncStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};
