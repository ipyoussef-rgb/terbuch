"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  amountCents: number | null;
  currency: string | null;
  requestedAt: string | null;
  choice: string | null;
  transactionId: string | null;
  status: string | null;
  rawStatus: string | null;
  lastCheckedAt: string | null;
};

export default function PaymentPanel({
  appointmentId,
  initial,
}: {
  appointmentId: string;
  initial: Initial;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(
    initial.amountCents != null ? (initial.amountCents / 100).toFixed(2) : "20.00",
  );
  const [currency, setCurrency] = useState(initial.currency ?? "EUR");
  const [description, setDescription] = useState("Bearbeitungsgebühr");
  const [busy, setBusy] = useState<"request" | "refresh" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestPayment() {
    setError(null);
    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Bitte gültigen Betrag eingeben");
      return;
    }
    setBusy("request");
    try {
      const res = await fetch("/api/admin/payment-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          amountCents: cents,
          currency,
          description,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(null);
    }
  }

  async function refreshStatus() {
    setError(null);
    setBusy("refresh");
    try {
      const res = await fetch("/api/admin/payment-status-refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(null);
    }
  }

  const hasRequest = !!initial.requestedAt;
  const choiceLabel =
    initial.choice === "online"
      ? "Online-Zahlung gewählt"
      : initial.choice === "onsite"
        ? "Vor-Ort-Zahlung gewählt"
        : null;

  return (
    <div className="space-y-5">
      {/* Status row */}
      {hasRequest ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Betrag">
            {((initial.amountCents ?? 0) / 100).toFixed(2)}{" "}
            {initial.currency ?? "EUR"}
          </Field>
          <Field label="Antwort der Bürger:in">
            {choiceLabel ?? (
              <span className="text-[var(--color-kobil-navy)]/50">
                wartet auf Antwort im Chat
              </span>
            )}
          </Field>
          <Field label="Transaktion">
            {initial.transactionId ? (
              <span className="font-mono text-xs break-all">
                {initial.transactionId}
              </span>
            ) : (
              <span className="text-[var(--color-kobil-navy)]/50">—</span>
            )}
          </Field>
          <Field label="Status">
            <PaymentStatusBadge status={initial.status} />
            {initial.rawStatus ? (
              <span className="ml-2 text-[10px] text-[var(--color-kobil-navy)]/50">
                ({initial.rawStatus})
              </span>
            ) : null}
            {initial.lastCheckedAt ? (
              <div className="text-[10px] text-[var(--color-kobil-navy)]/50 mt-1">
                geprüft: {new Date(initial.lastCheckedAt).toLocaleString("de-DE")}
              </div>
            ) : null}
          </Field>
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {!initial.choice ? (
          <>
            <Input label="Betrag" suffix={currency}>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-kobil-line)] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-kobil-blue)] focus:ring-2 focus:ring-[var(--color-kobil-blue)]/20"
              />
            </Input>
            <Input label="Währung">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="rounded-lg border border-[var(--color-kobil-line)] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-kobil-blue)] focus:ring-2 focus:ring-[var(--color-kobil-blue)]/20"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </Input>
            <Input label="Verwendungszweck">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-kobil-line)] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-kobil-blue)] focus:ring-2 focus:ring-[var(--color-kobil-blue)]/20"
              />
            </Input>
            <button
              type="button"
              onClick={requestPayment}
              disabled={busy === "request"}
              className="rounded-full bg-[var(--color-kobil-blue)] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[var(--color-kobil-blue-600)] disabled:opacity-60"
            >
              {busy === "request"
                ? "Sende…"
                : hasRequest
                  ? "Erneut anfragen"
                  : "Bezahlung anfragen"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={refreshStatus}
            disabled={busy === "refresh" || !initial.transactionId}
            className="rounded-full border border-[var(--color-kobil-line)] px-4 py-2 text-sm font-medium hover:border-[var(--color-kobil-blue)] hover:text-[var(--color-kobil-blue)] disabled:opacity-50"
          >
            {busy === "refresh" ? "Aktualisiere…" : "Status aktualisieren"}
          </button>
        )}
      </div>

      {error ? (
        <div className="text-xs text-red-700">{error}</div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-kobil-navy)]/50 font-semibold mb-1">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Input({
  label,
  suffix,
  children,
}: {
  label: string;
  suffix?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-kobil-navy)]/55 mb-1.5">
        {label}
        {suffix ? (
          <span className="ml-1 text-[var(--color-kobil-navy)]/40">({suffix})</span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function PaymentStatusBadge({ status }: { status: string | null }) {
  const cfg = !status
    ? { cls: "bg-neutral-100 text-neutral-700 border-neutral-200", label: "—" }
    : status === "SUCCESS"
      ? { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Bezahlt" }
      : status === "FAILED"
        ? { cls: "bg-rose-50 text-rose-700 border-rose-200", label: "Fehlgeschlagen" }
        : status === "CANCELLED"
          ? { cls: "bg-neutral-100 text-neutral-700 border-neutral-200", label: "Abgebrochen" }
          : { cls: "bg-amber-50 text-amber-700 border-amber-200", label: status };
  return (
    <span className={`text-xs rounded-full px-2.5 py-0.5 border font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
