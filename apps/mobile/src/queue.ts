import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { getConnection, api, upload } from "./api";
import * as Network from "expo-network";
import type { Scan } from "../../../shared/contracts";
export type Capture = {
  id: string;
  ownerId: string;
  uri: string;
  crop: string;
  note: string;
  region: string;
  lat?: number;
  lon?: number;
  status: string;
  created: number;
  attempts: number;
  error?: string;
  server?: Scan;
};
const KEY = "agro-captures-v1";
export async function readCaptures(): Promise<Capture[]> {
  const c = await getConnection();
  if (!c) return [];
  return JSON.parse((await AsyncStorage.getItem(KEY)) || "[]").filter(
    (p: Capture) => p.ownerId === c.user.id,
  );
}
async function all(): Promise<Capture[]> {
  return JSON.parse((await AsyncStorage.getItem(KEY)) || "[]");
}
let writing = Promise.resolve();
async function put(item: Capture) {
  writing = writing
    .catch(() => {})
    .then(async () => {
      const items = await all();
      await AsyncStorage.setItem(
        KEY,
        JSON.stringify([item, ...items.filter((x) => x.id !== item.id)]),
      );
    });
  await writing;
}
export async function queueCapture(
  uri: string,
  crop: string,
  note: string,
  region: string,
  location?: { lat: number; lon: number },
) {
  const c = await getConnection();
  if (!c) throw new Error("Connect your workspace before saving a capture.");
  const directory = new Directory(Paths.document, "captures");
  directory.create({ idempotent: true, intermediates: true });
  const id =
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 14);
  const file = new File(directory, id + ".jpg");
  new File(uri).copy(file);
  const item: Capture = {
    id,
    ownerId: c.user.id,
    uri: file.uri,
    crop,
    note,
    region,
    created: Date.now(),
    attempts: 0,
    status: "queued",
    ...location,
  };
  await put(item);
  return item;
}
let syncing: Promise<void> | null = null;
export function syncQueue() {
  if (syncing) return syncing;
  syncing = (async () => {
    const network = await Network.getNetworkStateAsync();
    if (!network.isConnected) return;
    for (const item of await readCaptures()) {
      if (item.server || item.attempts >= 3 || item.status === "discarded")
        continue;
      try {
        const fields: Record<string, string> = {
          crop: item.crop,
          note: item.note,
          region: item.region,
          client_id: item.id,
        };
        if (item.lat !== undefined && item.lon !== undefined) {
          fields.lat = String(item.lat);
          fields.lon = String(item.lon);
        }
        const scan = await upload(item.uri, fields);
        await put({
          ...item,
          status: scan.status,
          server: scan,
          error: undefined,
        });
      } catch (error) {
        await put({
          ...item,
          attempts: item.attempts + 1,
          error: (error as Error).message,
          status: item.attempts + 1 >= 3 ? "failed" : "queued",
        });
      }
    }
    const updates = await api<Scan[]>("scans");
    for (const item of await readCaptures()) {
      const server = updates.find((s) => s.id === item.server?.id);
      if (server) {
        await put({ ...item, server, status: server.status });
        if (
          ["complete", "invalidated"].includes(server.status) &&
          server.updated !== (item.server?.updated || 0)
        ) {
          const detail = await api<Scan>("scans/" + server.id);
          await saveOfflinePlan(detail);
        }
      }
    }
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}
export async function retryCapture(id: string) {
  const item = (await readCaptures()).find((x) => x.id === id);
  if (!item) return;
  if (item.server) {
    await api("scans/" + item.server.id + "/retry", { method: "POST" });
    await put({ ...item, status: "queued", error: undefined });
  } else {
    await put({ ...item, status: "queued", attempts: 0, error: undefined });
    await syncQueue();
  }
}
export async function discardCapture(id: string) {
  const items = await all();
  const item = items.find((x) => x.id === id);
  if (!item) return;
  const c = await getConnection();
  if (item.ownerId !== c?.user.id)
    throw new Error("This capture belongs to another account.");
  if (item.server)
    throw new Error(
      "This capture has already been uploaded. Manage it from the workspace.",
    );
  new File(item.uri).delete();
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(items.filter((x) => x.id !== id)),
  );
}
export async function refreshCapture(id: string) {
  const item = (await readCaptures()).find((x) => x.id === id);
  if (!item?.server) return item;
  const scan = await api<Scan>("scans/" + item.server.id);
  const updated = { ...item, server: scan, status: scan.status };
  await put(updated);
  return updated;
}
export async function saveOfflinePlan(scan: Scan) {
  const c = await getConnection();
  if (!c) return;
  const key = "agro-offline-plans-" + c.user.id;
  const items: Scan[] = JSON.parse((await AsyncStorage.getItem(key)) || "[]");
  await AsyncStorage.setItem(
    key,
    JSON.stringify(
      [scan, ...items.filter((s) => s.id !== scan.id)].slice(0, 5),
    ),
  );
}
export async function readOfflinePlans(): Promise<Scan[]> {
  const c = await getConnection();
  if (!c) return [];
  return JSON.parse(
    (await AsyncStorage.getItem("agro-offline-plans-" + c.user.id)) || "[]",
  );
}
