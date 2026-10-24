import { NextRequest, NextResponse } from "next/server";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const auth = await fetch("http://127.0.0.1:8000/api/auth/me", {
    headers: {
      Cookie: request.headers.get("cookie") || "",
      Authorization: request.headers.get("authorization") || "",
    },
    cache: "no-store",
  });
  if (!auth.ok)
    return NextResponse.json(
      { detail: "Sign in before downloading the native preview." },
      { status: 401 },
    );
  const file = path.join(
    process.cwd(),
    "apps/mobile/android/app/build/outputs/apk/release/app-release.apk",
  );
  try {
    const info = await stat(file);
    return new Response(
      Readable.toWeb(createReadStream(file)) as ReadableStream,
      {
        headers: {
          "Content-Type": "application/vnd.android.package-archive",
          "Content-Length": String(info.size),
          "Content-Disposition":
            'attachment; filename="agrosentinel-android-preview.apk"',
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        detail:
          "The Android APK has not finished building. Both platforms can use the Expo development app while the native build completes.",
      },
      { status: 503 },
    );
  }
}
