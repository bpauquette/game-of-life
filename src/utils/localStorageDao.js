// Basic localStorage DAO with safe fallbacks

const safeLocalStorage = (typeof globalThis !== 'undefined' && globalThis.localStorage) ? globalThis.localStorage : null;

export const localStorageDao = {
  get(key, defaultValue = null) {
    if (!safeLocalStorage) return defaultValue;
    const value = safeLocalStorage.getItem(key);
    if (value === null || value === undefined) return defaultValue;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },
  set(key, value) {
    if (!safeLocalStorage) return;
    const toStore = typeof value === 'string' ? value : JSON.stringify(value);
    safeLocalStorage.setItem(key, toStore);
  },
  remove(key) {
    if (!safeLocalStorage) return;
    safeLocalStorage.removeItem(key);
  }
};
