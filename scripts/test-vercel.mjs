import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { backendUrl } from "../app/backend-url.ts";

test("runtime binding preserves API paths, query strings and binding base paths", () => {
  const old = process.env.BACKEND_URL;
  try {
    process.env.BACKEND_URL = "https://internal.example/service/backend";
    assert.equal(backendUrl("/api/region-map?region=kaduna&period=24h").href,
      "https://internal.example/service/backend/api/region-map?region=kaduna&period=24h");
  } finally {
    if (old === undefined) delete process.env.BACKEND_URL;
    else process.env.BACKEND_URL = old;
  }
});

test("Vercel functions never silently call localhost without a binding", () => {
  const old = { url: process.env.BACKEND_URL, vercel: process.env.VERCEL };
  try {
    delete process.env.BACKEND_URL;
    process.env.VERCEL = "1";
    assert.throws(() => backendUrl("api/auth/me"), /BACKEND_URL/);
    delete process.env.VERCEL;
    assert.equal(backendUrl("api/live").href, "http://127.0.0.1:8000/api/live");
  } finally {
    for (const [key, value] of [["BACKEND_URL", old.url], ["VERCEL", old.vercel]]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("routing keeps Next-owned API helpers ahead of the backend rule", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url)));
  const target = path => config.rewrites.find(rule => new RegExp(`^${rule.source}$`).test(path)).destination.service;
  assert.equal(target("/api/network"), "app");
  assert.equal(target("/api/download/android"), "app");
  assert.equal(target("/api/auth/login"), "backend");
  assert.equal(target("/api/scans/a/image"), "backend");
  assert.equal(target("/dashboard"), "app");
  assert.deepEqual(config.services.app.bindings, [
    { type: "service", service: "backend", format: "url", env: "BACKEND_URL" },
  ]);
});
