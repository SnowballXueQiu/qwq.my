type MemoryKey = "nav-indicator" | "nav-indicator-pending" | "pending-scroll-section" | string;

declare global {
  interface Window {
    __snowballMemoryStorage?: Record<MemoryKey, string>;
  }
}

function memoryStorage() {
  if (typeof window === "undefined") return null;
  window.__snowballMemoryStorage ??= {};
  return window.__snowballMemoryStorage;
}

export function getBrowserStorageItem(key: MemoryKey) {
  if (typeof window === "undefined") return null;

  try {
    const value = window.sessionStorage?.getItem(key);
    if (value !== undefined && value !== null) return value;
  } catch {
    // Some embedded browser contexts expose no sessionStorage.
  }

  return memoryStorage()?.[key] ?? null;
}

export function setBrowserStorageItem(key: MemoryKey, value: string) {
  if (typeof window === "undefined") return;

  const memory = memoryStorage();
  if (memory) memory[key] = value;

  try {
    window.sessionStorage?.setItem(key, value);
  } catch {
    // Memory storage above keeps navigation state working.
  }
}

export function removeBrowserStorageItem(key: MemoryKey) {
  if (typeof window === "undefined") return;

  const memory = memoryStorage();
  if (memory) delete memory[key];

  try {
    window.sessionStorage?.removeItem(key);
  } catch {
    // Nothing else to do.
  }
}
