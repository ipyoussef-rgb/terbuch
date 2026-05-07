"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { haversineKm } from "@/lib/geo";

type Office = {
  id: string;
  name: string;
  city: string;
  street: string;
  postalCode: string;
  lat: number;
  lng: number;
};

type GeoState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; lat: number; lng: number }
  | { kind: "denied" }
  | { kind: "error"; msg: string };

export default function OfficePicker({
  offices,
  optionId,
}: {
  offices: Office[];
  optionId: string;
}) {
  const [geo, setGeo] = useState<GeoState>({ kind: "idle" });

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeo({ kind: "error", msg: "Geolocation nicht verfügbar" });
      return;
    }
    setGeo({ kind: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setGeo({
          kind: "ready",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeo({ kind: "denied" });
        } else {
          setGeo({ kind: "error", msg: err.message });
        }
      },
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  const sorted = useMemo(() => {
    if (geo.kind !== "ready") return offices;
    return [...offices]
      .map((o) => ({
        ...o,
        distanceKm: haversineKm(
          { lat: geo.lat, lng: geo.lng },
          { lat: o.lat, lng: o.lng },
        ),
      }))
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }, [offices, geo]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-neutral-500">
        {geo.kind === "loading" && "Standort wird ermittelt …"}
        {geo.kind === "ready" && "Sortiert nach Entfernung zu Ihrem Standort."}
        {geo.kind === "denied" &&
          "Standortzugriff verweigert — Ämter werden ohne Sortierung angezeigt."}
        {geo.kind === "error" &&
          `Standort nicht verfügbar (${geo.msg}) — Sortierung deaktiviert.`}
      </div>

      <ul className="divide-y divide-neutral-200 bg-white rounded-lg border border-neutral-200">
        {sorted.map((o) => (
          <li key={o.id}>
            <Link
              href={`/slots?option=${optionId}&office=${o.id}`}
              className="flex items-center justify-between p-4 hover:bg-neutral-50"
            >
              <div>
                <div className="font-medium">{o.name}</div>
                <div className="text-sm text-neutral-500">
                  {o.street}, {o.postalCode} {o.city}
                </div>
              </div>
              <div className="text-right">
                {"distanceKm" in o && typeof o.distanceKm === "number" ? (
                  <div className="text-sm text-neutral-600 tabular-nums">
                    {o.distanceKm.toFixed(1)} km
                  </div>
                ) : null}
                <div className="text-neutral-400">→</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
