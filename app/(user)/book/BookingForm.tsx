"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Prefill = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthdate: string;
  street: string;
  postalCode: string;
  city: string;
};

export default function BookingForm({
  slotId,
  optionId,
  prefill,
}: {
  slotId: string;
  optionId: string;
  prefill: Prefill;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Prefill>(prefill);
  const [privacy, setPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Prefill>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!privacy) {
      setError("Bitte stimmen Sie der Datenschutzerklärung zu.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slotId,
          serviceOptionId: optionId,
          ...form,
          privacyAccepted: true,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { id: string };
      router.push(`/booking/${json.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-[var(--color-kobil-line)] rounded-2xl p-5 sm:p-6 space-y-6 shadow-[var(--shadow-card)]"
    >
      <div>
        <h2 className="text-base font-semibold tracking-tight">
          Ihre Daten
        </h2>
        <p className="text-xs text-[var(--color-kobil-navy)]/60 mt-1">
          Aus Ihrer KOBIL Identity vorausgefüllt — Sie können alles anpassen.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Vorname" required>
          <Input
            value={form.firstName}
            onChange={(v) => update("firstName", v)}
            required
          />
        </Field>
        <Field label="Nachname" required>
          <Input
            value={form.lastName}
            onChange={(v) => update("lastName", v)}
            required
          />
        </Field>
        <Field label="E-Mail" required>
          <Input
            type="email"
            value={form.email}
            onChange={(v) => update("email", v)}
            required
          />
        </Field>
        <Field label="Telefonnummer">
          <Input
            type="tel"
            value={form.phone}
            onChange={(v) => update("phone", v)}
          />
        </Field>
        <Field label="Geburtsdatum">
          <Input
            type="date"
            value={form.birthdate ? form.birthdate.slice(0, 10) : ""}
            onChange={(v) => update("birthdate", v)}
          />
        </Field>
        <Field label="Straße und Hausnummer" required>
          <Input
            value={form.street}
            onChange={(v) => update("street", v)}
            required
          />
        </Field>
        <Field label="PLZ" required>
          <Input
            value={form.postalCode}
            onChange={(v) => update("postalCode", v)}
            required
          />
        </Field>
        <Field label="Wohnort" required>
          <Input
            value={form.city}
            onChange={(v) => update("city", v)}
            required
          />
        </Field>
      </div>

      <label className="flex items-start gap-3 text-sm text-[var(--color-kobil-navy)]/80 bg-[var(--color-kobil-mist-50)] border border-[var(--color-kobil-line)] rounded-xl p-4 cursor-pointer hover:border-[var(--color-kobil-blue)]/50 transition-colors">
        <input
          type="checkbox"
          checked={privacy}
          onChange={(e) => setPrivacy(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[var(--color-kobil-line)] text-[var(--color-kobil-blue)] focus:ring-[var(--color-kobil-blue)] cursor-pointer"
        />
        <span>
          Ich stimme der Verarbeitung meiner Daten zur Terminbuchung gemäß der{" "}
          <a
            href="/datenschutz"
            target="_blank"
            className="underline text-[var(--color-kobil-blue)]"
          >
            Datenschutzerklärung
          </a>{" "}
          zu.
        </span>
      </label>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
        <p className="text-xs text-[var(--color-kobil-navy)]/55 sm:flex-1">
          Sie bestätigen den Termin anschließend in Ihrem KOBIL Chat.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-kobil-blue)] text-white px-6 py-3 text-sm font-semibold shadow-[var(--shadow-card)] hover:bg-[var(--color-kobil-blue-600)] active:bg-[var(--color-kobil-blue-700)] disabled:opacity-60 transition-colors"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Reserviere…
            </>
          ) : (
            <>
              Reservieren
              <svg viewBox="0 0 16 16" className="w-4 h-4" aria-hidden="true">
                <path
                  d="M3 8h10m0 0L9 4m4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[var(--color-kobil-navy)]/70 mb-1.5">
        {label}
        {required ? <span className="text-[var(--color-kobil-blue)]"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full rounded-lg border border-[var(--color-kobil-line)] bg-white px-3 py-2.5 text-sm placeholder:text-[var(--color-kobil-navy)]/30 focus:outline-none focus:border-[var(--color-kobil-blue)] focus:ring-2 focus:ring-[var(--color-kobil-blue)]/20 transition-colors"
    />
  );
}
