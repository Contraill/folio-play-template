/** Small values kept on this device (best scores, settings). Storage can be full, blocked or wiped: never required. */
export function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v === null ? fallback : (JSON.parse(v) as T); } catch { return fallback; }
}
export function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* the game goes on without it */ }
}
