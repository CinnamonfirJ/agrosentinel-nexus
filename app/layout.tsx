import "@fontsource-variable/hanken-grotesk";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "AgroSentinel Nexus · Regional intelligence",
  description: "Grounded intelligence. Resilient agriculture.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
