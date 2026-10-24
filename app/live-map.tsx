"use client";
import { useEffect, useRef, useState } from "react";
import type { Cluster } from "./regions";
import type { Workspace } from "../shared/contracts";
import type * as L from "leaflet";
export function LiveMap({
  clusters,
  region,
  bounds,
  loading = false,
  onOpen,
}: {
  clusters: Workspace["clusters"];
  region: string;
  bounds?: number[];
  loading?: boolean;
  onOpen: (c: Cluster) => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    layer = useRef<L.LayerGroup | null>(null);
  const [error, setError] = useState("");
  const callback = useRef(onOpen);
  const previousRegion = useRef("");
  callback.current = onOpen;
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !root.current) return;
      map.current = L.map(root.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([10.5, 7.4], 7);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      })
        .on("tileerror", () =>
          setError(
            "Some map tiles are unavailable. The accessible cluster list remains available.",
          ),
        )
        .addTo(map.current);
      layer.current = L.layerGroup().addTo(map.current);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !map.current || !layer.current) return;
      layer.current.clearLayers();
      for (const c of clusters) {
        const marker = L.marker([c.lat, c.lon], {
          title: `${c.disease}, ${c.count} observations`,
          keyboard: true,
          icon: L.divIcon({
            className: "live-cluster live-level-" + c.level,
            html: `<span>${c.count}</span>`,
            iconSize: [40, 40],
          }),
        });
        marker.on("click", () => callback.current(c));
        marker.addTo(layer.current);
      }
      const centers: Record<string, [number, number]> = {
        kaduna: [10.5, 7.4],
        "dry-corridor": [14.5, -88],
        "east-africa": [-1, 36],
        "indo-gangetic": [27, 81],
        mekong: [14, 104],
      };
      if (clusters.length && previousRegion.current !== region)
        map.current.fitBounds(
          L.latLngBounds(
            clusters.map((c) => [c.lat, c.lon] as [number, number]),
          ),
          { maxZoom: 10, padding: [35, 35] },
        );
      else if (previousRegion.current !== region) {
        if (bounds)
          map.current.fitBounds([
            [bounds[1], bounds[0]],
            [bounds[3], bounds[2]],
          ]);
        else map.current.setView(centers[region] || centers.kaduna, 6);
      }
      previousRegion.current = region;
    });
    return () => {
      cancelled = true;
    };
  }, [clusters, region]);
  return (
    <div style={{ position: "relative" }}>
      <div
        ref={root}
        className="map"
        aria-label="Geographical outbreak map"
        style={{ height: 450 }}
      />
      <div
        style={{
          position: "absolute",
          left: 12,
          top: 365,
          zIndex: 500,
          background: "var(--dark)",
          color: "#E9EEE9",
          padding: 10,
          borderRadius: 8,
          fontSize: 11,
        }}
        aria-label="Detection intensity legend"
      >
        OBSERVATIONS PER CLUSTER
        <br />
        {[
          ["#3F5A34", "1–2"],
          ["#8C5A2B", "3–5"],
          ["#D2693A", "6–8"],
          ["#F0A24A", "9+"],
        ].map(([color, label]) => (
          <span
            key={label}
            style={{
              display: "inline-flex",
              gap: 5,
              alignItems: "center",
              marginRight: 10,
              marginTop: 6,
            }}
          >
            <i
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: color,
                border: "1px solid #E9EEE9",
              }}
            />
            {label}
          </span>
        ))}
      </div>
      {!clusters.length && (
        <div
          style={{
            position: "absolute",
            top: 175,
            left: "15%",
            right: "15%",
            zIndex: 500,
            padding: 20,
            background: "var(--surface)",
            borderRadius: 14,
            textAlign: "center",
          }}
        >
          {loading
            ? "Loading regional observations…"
            : "No analyzed, geolocated detections in this window. Capture a leaf with GPS to place an observation here."}
        </div>
      )}
      {error && (
        <p role="status" style={{ padding: 12 }}>
          {error}
        </p>
      )}
      <div className="map-footer">
        Cluster counts show photo-based hypotheses, not lab-confirmed outbreaks.
        Locations are aggregated to roughly 10 km cells.
      </div>
    </div>
  );
}
