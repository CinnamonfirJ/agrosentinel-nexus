import { fetch } from "expo/fetch";
import { File } from "expo-file-system";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import type { Member, Scan } from "../../../shared/contracts";
export type Connection = { server: string; token: string; user: Member };
const KEY = "agrosentinel-connection";
let connection: Connection | null = null;
export async function getConnection() {
  if (!connection) {
    const text = await SecureStore.getItemAsync(KEY);
    if (text) connection = JSON.parse(text);
  }
  return connection;
}
export function suggestedServer() {
  const host = Constants.expoConfig?.hostUri;
  if (!host) return "";
  try {
    return "http://" + new URL("http://" + host).hostname + ":3000";
  } catch {
    return "";
  }
}
export async function connect(server: string, code: string) {
  const url = server.trim().replace(/\/$/, "");
  if (!/^https?:\/\//.test(url))
    throw new Error("Enter a complete http:// or https:// workspace address.");
  const r = await fetch(url + "/api/auth/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || "Pairing failed");
  connection = { server: url, token: data.token, user: data.user };
  await SecureStore.setItemAsync(KEY, JSON.stringify(connection), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  return connection;
}
export async function signIn(server: string, email: string, password: string) {
  const url = server.trim().replace(/\/$/, "");
  if (!/^https?:\/\//.test(url))
    throw new Error("Enter a valid workspace URL.");
  const r = await fetch(url + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || "Sign-in failed");
  connection = { server: url, token: data.token, user: data.user };
  await SecureStore.setItemAsync(KEY, JSON.stringify(connection), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  return connection;
}
export async function disconnect() {
  try {
    const push = await SecureStore.getItemAsync("agro-push-token");
    if (push)
      await api("devices", {
        method: "DELETE",
        body: JSON.stringify({ token: push }),
      });
    await api("auth/logout", { method: "POST" });
  } finally {
    connection = null;
    await SecureStore.deleteItemAsync(KEY);
    await SecureStore.deleteItemAsync("agro-push-token");
  }
}
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const c = await getConnection();
  if (!c) throw new Error("Connect to your workspace first.");
  const headers = new Headers(options.headers as HeadersInit);
  headers.set("Authorization", "Bearer " + c.token);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const r = await fetch(c.server + "/api/" + path, {
    ...options,
    headers,
    signal: options.signal || AbortSignal.timeout(30000),
  });
  const data = await r.json();
  if (!r.ok)
    throw new Error(
      typeof data.detail === "string" ? data.detail : "Request failed",
    );
  return data;
}
export async function upload(uri: string, fields: Record<string, string>) {
  const form = new FormData();
  form.append("image", new File(uri), "leaf.jpg");
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return api<Scan>("scan", { method: "POST", body: form });
}
