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

  const fieldClass =
    "w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900";

  return (
    <form onSubmit={onSubmit} className="space-y-6 bg-white border border-neutral-200 rounded-lg p-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Vorname">
          <input
            className={fieldClass}
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            required
          />
        </Field>
        <Field label="Nachname">
          <input
            className={fieldClass}
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            required
          />
        </Field>
        <Field label="E-Mail">
          <input
            type="email"
            className={fieldClass}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
          />
        </Field>
        <Field label="Telefonnummer">
          <input
            type="tel"
            className={fieldClass}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </Field>
        <Field label="Geburtsdatum">
          <input
            type="date"
            className={fieldClass}
            value={form.birthdate ? form.birthdate.slice(0, 10) : ""}
            onChange={(e) => update("birthdate", e.target.value)}
          />
        </Field>
        <Field label="Straße und Hausnummer">
          <input
            className={fieldClass}
            value={form.street}
            onChange={(e) => update("street", e.target.value)}
            required
          />
        </Field>
        <Field label="PLZ">
          <input
            className={fieldClass}
            value={form.postalCode}
            onChange={(e) => update("postalCode", e.target.value)}
            required
          />
        </Field>
        <Field label="Wohnort">
          <input
            className={fieldClass}
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            required
          />
        </Field>
      </div>

      <label className="flex items-start gap-3 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={privacy}
          onChange={(e) => setPrivacy(e.target.checked)}
          className="mt-1"
        />
        <span>
          Ich stimme der Verarbeitung meiner Daten zur Terminbuchung gemäß der{" "}
          <a href="/datenschutz" target="_blank" className="underline">
            Datenschutzerklärung
          </a>{" "}
          zu.
        </span>
      </label>

      {error ? (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-neutral-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "Reserviere…" : "Reservieren"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-neutral-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
