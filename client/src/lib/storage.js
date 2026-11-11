/**
 * localStorage wrapper for persisted stores. Storage can be blocked (private mode, disabled site
 * data) or missing (tests, SSR), so every access is guarded and falls back to memory.
 */
const memory = new Map();

const native = () => {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
};

export const safeStorage = {
  getItem(key) {
    try {
      const ls = native();
      return ls ? ls.getItem(key) : (memory.get(key) ?? null);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  setItem(key, value) {
    try {
      const ls = native();
      if (ls) ls.setItem(key, value);
      else memory.set(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  removeItem(key) {
    try {
      native()?.removeItem(key);
    } catch {
      /* nothing to remove */
    }
    memory.delete(key);
  },
};
