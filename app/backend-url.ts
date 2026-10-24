// Server components and route handlers only. Bindings resolve at runtime.
export function backendUrl(path: string): URL {
  const base = process.env.BACKEND_URL;
  if (!base && process.env.VERCEL) {
    throw new Error("The app service requires its BACKEND_URL service binding.");
  }
  return new URL(path.replace(/^\/+/, ""), (base || "http://127.0.0.1:8000").replace(/\/?$/, "/"));
}
