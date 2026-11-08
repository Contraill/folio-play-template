/** Small values kept on this device (best scores, settings). Storage can be full, blocked or wiped: never required.
    Keys start with the app's place in Folio (namespace()), so two games on the same site never share a key. */
import { namespace } from './folio.ts';

export function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(namespace() + key); return v === null ? fallback : (JSON.parse(v) as T); } catch { return fallback; }
}
export function save(key: string, value: unknown) {
  try { localStorage.setItem(namespace() + key, JSON.stringify(value)); } catch { /* the game goes on without it */ }
}
