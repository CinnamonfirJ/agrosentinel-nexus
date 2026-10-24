import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "../../backend-url";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  if (
    path.some(
      (p) =>
        !p || p === ".." || p === "." || p.includes("/") || p.includes("\\"),
    )
  )
    return NextResponse.json({ detail: "Invalid path" }, { status: 400 });
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host"))
      return NextResponse.json(
        { detail: "Cross-origin request rejected" },
        { status: 403 },
      );
    if (Number(request.headers.get("content-length") || 0) > 11 * 1024 * 1024)
      return NextResponse.json(
        { detail: "Request too large" },
        { status: 413 },
      );
  }
  const headers = new Headers();
  for (const k of [
    "content-type",
    "authorization",
    "cookie",
    "last-event-id",
  ]) {
    const v = request.headers.get(k);
    if (v) headers.set(k, v);
  }
  try {
    const upstream = await fetch(
      backendUrl("api/" + path.map(encodeURIComponent).join("/") + request.nextUrl.search),
      {
        method: request.method,
        headers,
        body: ["GET", "HEAD"].includes(request.method)
          ? undefined
          : await request.arrayBuffer(),
        cache: "no-store",
        signal: AbortSignal.timeout(
          path.join("/") === "settings/neon" ? 15 * 60 * 1000 : 120000,
        ),
      },
    );
    const out = new Headers();
    for (const k of ["content-type", "cache-control", "x-accel-buffering"]) {
      const v = upstream.headers.get(k);
      if (v) out.set(k, v);
    }
    for (const cookie of upstream.headers.getSetCookie())
      out.append(
        "set-cookie",
        request.headers.get("x-forwarded-proto") === "https"
          ? cookie + "; Secure"
          : cookie,
      );
    return new Response(upstream.body, {
      status: upstream.status,
      headers: out,
    });
  } catch {
    return NextResponse.json(
      {
        detail:
          "The backend is unavailable. Check the service deployment and database connection.",
      },
      { status: 503 },
    );
  }
}
export {
  proxy as GET,
  proxy as POST,
  proxy as DELETE,
  proxy as PATCH,
  proxy as PUT,
};
