"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { Workspace, Member } from "../shared/contracts";
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const r = await fetch("/api/" + path, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    cache: "no-store",
  });
  const content = await r
    .json()
    .catch(() => ({ detail: "Server returned an unreadable response." }));
  if (!r.ok)
    throw Object.assign(
      new Error(
        typeof content.detail === "string"
          ? content.detail
          : JSON.stringify(content.detail),
      ),
      { status: r.status },
    );
  return content;
}
export function useWorkspace(
  region: string,
  period: string,
  initial: Workspace | null = null,
) {
  const lastEvent = useRef(0);
  const [data, setData] = useState<Workspace | null>(initial),
    [error, setError] = useState(""),
    [me, setMe] = useState<Member | null>(null),
    [members, setMembers] = useState<Member[]>([]),
    [online, setOnline] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const next = await api<Workspace>(
        `region-map?region=${encodeURIComponent(region)}&period=${period}`,
      );
      setData(next);
      setError("");
      setOnline(true);
      if (typeof window !== "undefined")
        try {
          localStorage.setItem(
            "agro-workspace-" + region + "-" + period,
            JSON.stringify(next),
          );
        } catch {}
    } catch (e) {
      setError((e as Error).message);
      setOnline(false);
      try {
        const cached = localStorage.getItem(
          "agro-workspace-" + region + "-" + period,
        );
        if (cached) setData(JSON.parse(cached));
      } catch {}
    }
  }, [region, period]);
  useEffect(() => {
    setData((previous) => (previous?.region === region ? previous : null));
    void refresh();
    const t = setInterval(refresh, 15000);
    const events = new EventSource("/api/events");
    events.addEventListener("update", () => {
      if (Date.now() - lastEvent.current > 2000) {
        lastEvent.current = Date.now();
        void refresh();
      }
    });
    return () => {
      clearInterval(t);
      events.close();
    };
  }, [refresh]);
  useEffect(() => {
    api<Member>("auth/me")
      .then(setMe)
      .catch((error) => {
        if (error.status === 401) window.location.href = "/login";
      });
    api<Member[]>("team")
      .then(setMembers)
      .catch(() => {});
  }, []);
  return {
    data: data?.region === region ? data : null,
    error,
    me,
    members,
    online,
    refresh,
  };
}
