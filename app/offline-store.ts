import type { Scan } from "../shared/contracts";
export type LocalCapture = {
  id: string;
  ownerId: string;
  blob: Blob;
  crop: string;
  note: string;
  region: string;
  lat?: number;
  lon?: number;
  created: number;
  attempts: number;
  serverId?: string;
  error?: string;
};
function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("agrosentinel", 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("captures", { keyPath: "id" });
      r.result.createObjectStore("cache");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function run<T>(
  store: string,
  mode: IDBTransactionMode,
  operation: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = operation(tx.objectStore(store));
    let value: T;
    req.onsuccess = () => {
      value = req.result;
    };
    tx.oncomplete = () => {
      db.close();
      resolve(value);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export const captures = () =>
  run<LocalCapture[]>("captures", "readonly", (s) => s.getAll());
export const saveCapture = (capture: LocalCapture) =>
  run("captures", "readwrite", (s) => s.put(capture));
export const removeCapture = (id: string) =>
  run("captures", "readwrite", (s) => s.delete(id));
export const cacheGet = <T>(key: string) =>
  run<T | undefined>("cache", "readonly", (s) => s.get(key));
export const cachePut = (key: string, value: unknown) =>
  run("cache", "readwrite", (s) => s.put(value, key));
let syncing: Promise<unknown> | null = null;
export function syncCaptures() {
  if (syncing) return syncing;
  syncing = (async () => {
    const auth = await fetch("/api/auth/me");
    if (!auth.ok) return;
    const owner = await auth.json();
    for (const item of await captures()) {
      if (item.ownerId !== owner.id || item.serverId || item.attempts >= 3)
        continue;
      try {
        const form = new FormData();
        form.set("image", item.blob, "leaf.jpg");
        for (const key of ["crop", "note", "region"] as const)
          form.set(key, item[key]);
        form.set("client_id", item.id);
        if (item.lat !== undefined && item.lon !== undefined) {
          form.set("lat", String(item.lat));
          form.set("lon", String(item.lon));
        }
        const r = await fetch("/api/scan", { method: "POST", body: form });
        const data = await r.json();
        if (!r.ok) throw new Error(data.detail || "Upload failed");
        await saveCapture({ ...item, serverId: data.id, error: undefined });
      } catch (error) {
        await saveCapture({
          ...item,
          attempts: item.attempts + 1,
          error: (error as Error).message,
        });
      }
    }
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}
