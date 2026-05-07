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
      setGeo({ kind: "error", msg: "nicht verfügbar" });
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
        if (err.code === err.PERMISSION_DENIED) setGeo({ kind: "denied" });
        else setGeo({ kind: "error", msg: err.message });
      },
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  const sorted = useMemo(() => {
    if (geo.kind !== "ready") return offices.map((o) => ({ ...o, distanceKm: undefined as number | undefined }));
    return [...offices]
      .map((o) => ({
        ...o,
        distanceKm: haversineKm(
          { lat: geo.lat, lng: geo.lng },
          { lat: o.lat, lng: o.lng },
        ) as number | undefined,
      }))
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }, [offices, geo]);

  return (
    <div className="space-y-4">
      <GeoBanner geo={geo} />

      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        {sorted.map((o) => (
          <Link
            key={o.id}
            href={`/slots?option=${optionId}&office=${o.id}`}
            className="group bg-white rounded-2xl border border-[var(--color-kobil-line)] p-5 hover:border-[var(--color-kobil-blue)] hover:shadow-[var(--shadow-card)] transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold tracking-tight">{o.name}</div>
                <div className="text-sm text-[var(--color-kobil-navy)]/60 mt-1 leading-snug">
                  {o.street}
                  <br />
                  {o.postalCode} {o.city}
                </div>
              </div>
              {typeof o.distanceKm === "number" ? (
                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[var(--color-kobil-mist)] px-2.5 py-1 text-xs font-medium text-[var(--color-kobil-blue)] tabular-nums">
                  <svg viewBox="0 0 16 16" className="w-3 h-3" aria-hidden="true">
                    <path
                      d="M8 2c-2.5 0-4.5 2-4.5 4.5 0 3.5 4.5 7.5 4.5 7.5s4.5-4 4.5-7.5C12.5 4 10.5 2 8 2Z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      fill="none"
                    />
                    <circle cx="8" cy="6.5" r="1.5" fill="currentColor" />
                  </svg>
                  {o.distanceKm.toFixed(1)} km
                </span>
              ) : null}
            </div>
            <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-kobil-blue)]">
              Termine ansehen
              <svg
                viewBox="0 0 16 16"
                className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              >
                <path
                  d="M3 8h10m0 0L9 4m4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function GeoBanner({ geo }: { geo: GeoState }) {
  if (geo.kind === "idle" || geo.kind === "loading") {
    return (
      <div className="rounded-xl bg-[var(--color-kobil-mist-50)] border border-[var(--color-kobil-line)] px-4 py-3 text-sm text-[var(--color-kobil-navy)]/70">
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-kobil-blue)] animate-pulse mr-2 align-middle" />
        Standort wird ermittelt …
      </div>
    );
  }
  if (geo.kind === "ready") {
    return (
      <div className="rounded-xl bg-[var(--color-kobil-mist-50)] border border-[var(--color-kobil-line)] px-4 py-3 text-sm text-[var(--color-kobil-navy)]/70">
        Sortiert nach Entfernung zu Ihrem Standort.
      </div>
    );
  }
  if (geo.kind === "denied") {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
        Standortzugriff verweigert — Ämter werden ohne Sortierung angezeigt.
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
      Standort {geo.msg} — Sortierung deaktiviert.
    </div>
  );
}
