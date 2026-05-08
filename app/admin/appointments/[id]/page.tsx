import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import ChatPanel from "./ChatPanel";
import PaymentPanel from "./PaymentPanel";

export const dynamic = "force-dynamic";

export default async function AdminAppointmentDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const a = await db.appointment.findUnique({
    where: { id },
    include: {
      slot: { include: { office: true, service: true } },
      serviceOption: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!a) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/appointments"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-kobil-navy)]/60 hover:text-[var(--color-kobil-blue)]"
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" aria-hidden="true">
            <path
              d="M13 8H3m0 0 4 4M3 8l4-4"
              stroke="currentColor"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Termine
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {format(a.slot.startsAt, "EEE d. MMM yyyy HH:mm", { locale: de })}
          </h1>
          <StatusBadge status={a.status} />
        </div>
      </div>

      {a.chatInitError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="font-semibold mb-1">
            Chat-Init fehlgeschlagen
          </div>
          <pre className="whitespace-pre-wrap break-words text-xs font-mono">
            {a.chatInitError}
          </pre>
        </div>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <section className="rounded-2xl border border-[var(--color-kobil-line)] bg-white p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-kobil-navy)]/60 mb-3">
              Termindaten
            </h2>
            <dl className="space-y-3 text-sm">
              <Row label="Service">
                <div className="font-medium">{a.slot.service.name}</div>
                <div className="text-[var(--color-kobil-navy)]/70">{a.serviceOption.name}</div>
              </Row>
              <Row label="Amt">
                <div className="font-medium">{a.slot.office.name}</div>
                <div className="text-[var(--color-kobil-navy)]/70 text-xs">
                  {a.slot.office.street}, {a.slot.office.postalCode} {a.slot.office.city}
                </div>
              </Row>
              <Row label="Datum">
                {format(a.slot.startsAt, "EEEE, d. MMMM yyyy", { locale: de })}
                <span className="text-[var(--color-kobil-navy)]/50"> · </span>
                <span className="tabular-nums">
                  {format(a.slot.startsAt, "HH:mm")} Uhr
                </span>
              </Row>
            </dl>
          </div>

          <div className="border-t border-[var(--color-kobil-line)] pt-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-kobil-navy)]/60 mb-3">
              Person
            </h2>
            <dl className="space-y-3 text-sm">
              <Row label="Name">
                {a.firstName} {a.lastName}
              </Row>
              <Row label="E-Mail">
                <a href={`mailto:${a.email}`} className="text-[var(--color-kobil-blue)] hover:underline">
                  {a.email}
                </a>
              </Row>
              {a.phone ? (
                <Row label="Telefon">
                  <a href={`tel:${a.phone}`} className="text-[var(--color-kobil-blue)] hover:underline">
                    {a.phone}
                  </a>
                </Row>
              ) : null}
              {a.birthdate ? (
                <Row label="Geburtsdatum">
                  {format(a.birthdate, "d. MMMM yyyy", { locale: de })}
                </Row>
              ) : null}
              <Row label="Adresse">
                {a.street}
                <br />
                {a.postalCode} {a.city}
              </Row>
              <Row label="KOBIL Sub" mono>
                {a.kobilSub}
              </Row>
            </dl>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-kobil-line)] bg-white p-5 sm:p-6 flex flex-col min-h-[460px]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-kobil-navy)]/60 mb-3 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--color-kobil-blue)]" fill="none" aria-hidden="true">
              <path
                d="M5 7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-3l-4 3v-3H8a3 3 0 0 1-3-3V7Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
            KOBIL Chat
          </h2>
          <ChatPanel
            appointmentId={a.id}
            disabled={a.status !== "CONFIRMED"}
            disabledReason={
              a.status === "PENDING"
                ? "Chat-Komponist verfügbar sobald die Bürger:in den Termin bestätigt hat."
                : a.status === "CANCELLED"
                  ? "Termin wurde abgebrochen."
                  : null
            }
            initialMessages={a.messages.map((m) => ({
              id: m.id,
              direction: m.direction,
              type: m.type,
              body: m.body,
              createdAt: m.createdAt.toISOString(),
            }))}
          />
        </section>
      </div>

      {a.status === "CONFIRMED" ? (
        <section className="rounded-2xl border border-[var(--color-kobil-line)] bg-white p-5 sm:p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-kobil-navy)]/60 mb-4 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--color-kobil-blue)]" fill="none" aria-hidden="true">
              <path
                d="M3 8h18M3 12h18M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
            Bezahlung
          </h2>
          <PaymentPanel
            appointmentId={a.id}
            initial={{
              amountCents: a.paymentAmountCents,
              currency: a.paymentCurrency,
              requestedAt: a.paymentRequestedAt?.toISOString() ?? null,
              choice: a.paymentChoice,
              transactionId: a.paymentTransactionId,
              transactionCreatedAt:
                a.paymentTransactionCreatedAt?.toISOString() ?? null,
              status: a.paymentStatus,
              rawStatus: a.paymentRawStatus,
              lastCheckedAt: a.paymentLastCheckedAt?.toISOString() ?? null,
            }}
          />
        </section>
      ) : null}
    </div>
  );
}

function Row({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <dt className="text-[10px] uppercase tracking-wider text-[var(--color-kobil-navy)]/50 font-semibold sm:w-28 sm:pt-0.5">
        {label}
      </dt>
      <dd className={`flex-1 mt-0.5 sm:mt-0 ${mono ? "font-mono text-xs break-all text-[var(--color-kobil-navy)]/70" : ""}`}>
        {children}
      </dd>
    </div>
  );
}

function StatusBadge({ status }: { status: "PENDING" | "CONFIRMED" | "CANCELLED" }) {
  const cfg =
    status === "CONFIRMED"
      ? { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Bestätigt" }
      : status === "CANCELLED"
        ? { cls: "bg-rose-50 text-rose-700 border-rose-200", label: "Storno" }
        : { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Offen" };
  return (
    <span className={`text-xs rounded-full px-3 py-1 border font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
