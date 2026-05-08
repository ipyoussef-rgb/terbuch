import type { PaymentStatus } from "./pay-client";

/** German label + Tailwind classes for each normalized payment status. */
export const PAYMENT_STATUS_LABELS: Record<
  PaymentStatus,
  { label: string; cls: string }
> = {
  SUCCESS: {
    label: "Bezahlt",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  FAILED: {
    label: "Fehlgeschlagen",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
  },
  CANCELLED: {
    label: "Storniert",
    cls: "bg-neutral-100 text-neutral-700 border-neutral-200",
  },
  TIMEOUT: {
    label: "Abgelaufen",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
  },
  REFUNDED: {
    label: "Rückerstattet",
    cls: "bg-orange-50 text-orange-700 border-orange-200",
  },
  PENDING: {
    label: "In Bearbeitung",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  INITIATED: {
    label: "Gestartet",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  UNKNOWN: {
    label: "Status unbekannt",
    cls: "bg-neutral-100 text-neutral-600 border-neutral-200",
  },
};

/**
 * Friendly German label for the raw KOBIL Pay status string (`finished`,
 * `processing_3d_secure`, `void`, …) — useful for the small "(raw)"
 * sub-text under the main badge.
 */
export function germanRawStatus(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const u = raw.toLowerCase().trim();
  switch (u) {
    case "new":
      return "neu angelegt";
    case "processing":
      return "wird bearbeitet";
    case "processing_3d_secure":
      return "3D-Secure-Authentifizierung";
    case "processing_digital":
      return "digitale Bearbeitung";
    case "notification":
      return "Benachrichtigung";
    case "inquiring status":
      return "Status-Abfrage läuft";
    case "finished":
      return "abgeschlossen";
    case "cancelled":
    case "canceled":
      return "storniert";
    case "closed":
      return "geschlossen";
    case "timeout":
      return "Zeitüberschreitung";
    case "error":
      return "Fehler";
    case "void":
      return "vor Tagesende rückerstattet";
    case "refund":
      return "rückerstattet";
    case "cancellation":
      return "Stornierung läuft";
    default:
      return raw;
  }
}
