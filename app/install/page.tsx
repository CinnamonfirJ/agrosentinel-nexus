"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { api } from "../client";
export default function Install() {
  const [qr, setQr] = useState(""),
    [expo, setExpo] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    async function init() {
      await api("auth/me");
      let host = window.location.hostname;
      if (["localhost", "127.0.0.1"].includes(host)) {
        const net = await api("network");
        if (net.addresses[0]) host = new URL(net.addresses[0].url).hostname;
      }
      const url = `exp://${host}:8081`;
      setExpo(url);
      setQr(await QRCode.toDataURL(url));
    }
    init().catch((e) => setError(e.message));
  }, []);
  return (
    <main className="field-page">
      <Link className="text-button" href="/dashboard">
        ← Workspace
      </Link>
      <h1>Take it to the field.</h1>
      <h2>Android native preview</h2>
      <p>
        This installable preview connects to the same persistent backend as your
        laptop. Sign in on your phone, download it, then pair from Dashboard →
        Settings.
      </p>
      <a className="primary" href="/api/download/android">
        Download Android APK
      </a>
      <h2>Android and iOS with Expo</h2>
      <p>
        Use a compatible Expo Go app to open the native project. The laptop’s
        Expo bundler must be running, and both devices must reach the same Wi-Fi
        address.
      </p>
      {qr && (
        <img
          src={qr}
          width={240}
          height={240}
          alt="Expo native app QR for Android and iOS"
        />
      )}
      <a className="text-button" href={expo || "#"}>
        {expo || "Reading local address…"}
      </a>
      <p>
        After opening the app, use its Connect screen to scan the one-time
        workspace pairing code.
      </p>
      <p>
        Remote push needs platform delivery credentials and a native build. iOS
        device binary signing requires Apple developer access.
      </p>
      {error && (
        <p role="alert">
          {error} <Link href="/login?next=/install">Sign in</Link>
        </p>
      )}
    </main>
  );
}
