import { NextRequest, NextResponse } from "next/server";
import os from "node:os";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const auth = await fetch("http://127.0.0.1:8000/api/auth/me", {
      headers: {
        Cookie: request.headers.get("cookie") || "",
        Authorization: request.headers.get("authorization") || "",
      },
      cache: "no-store",
    });
    if (!auth.ok)
      return NextResponse.json({ detail: "Sign in first." }, { status: 401 });
    const candidates = Object.entries(os.networkInterfaces())
      .flatMap(([name, addresses]) =>
        (addresses || [])
          .filter(
            (a) =>
              a.family === "IPv4" &&
              !a.internal &&
              !a.address.startsWith("169.254."),
          )
          .map((a) => ({
            name,
            url: `http://${a.address}:3000`,
            priority: /wi-fi|wlan|ethernet/i.test(name) ? 0 : 1,
          })),
      )
      .sort((a, b) => a.priority - b.priority);
    return NextResponse.json({ addresses: candidates });
  } catch {
    return NextResponse.json(
      { detail: "Backend unavailable." },
      { status: 503 },
    );
  }
}
